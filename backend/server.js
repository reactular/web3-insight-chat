import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getLLMResponse } from './services/llm.js';
import { searchWeb3Context } from './services/web3.js';
import { searchSimilar, addDocument, getAllDocuments } from './services/vectorStore.js';
import { testConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({ 
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`Received message: ${message}`);

    // Step 1: Search vector store for relevant context
    let vectorContext = '';
    let vectorSources = [];
    try {
      const similarDocs = await searchSimilar(message, 3, 0.6); // Get top 3 similar docs
      if (similarDocs.length > 0) {
        vectorContext = similarDocs
          .map(doc => `[From stored knowledge]: ${doc.content}`)
          .join('\n\n');
        vectorSources = similarDocs.map(doc => ({
          name: doc.metadata?.title || doc.metadata?.source || 'Stored Knowledge',
          url: doc.metadata?.url || '#'
        }));
        console.log(`Found ${similarDocs.length} relevant documents from vector store`);
      }
    } catch (error) {
      // Vector store might be empty or unavailable - continue without it
      console.log('Vector store search failed (might be empty):', error.message);
    }

    // Step 2: Fetch relevant Web3 context (real-time data)
    const web3Context = await searchWeb3Context(message);
    const web3Data = web3Context?.relevantData || '';

    // Step 3: Combine all context
    const combinedContext = [vectorContext, web3Data]
      .filter(c => c.trim().length > 0)
      .join('\n\n');

    // Step 4: Get LLM response
    let llmContent;
    let sources = [];
    
    try {
      llmContent = await getLLMResponse(message, combinedContext);
      
      // Combine sources from both vector store and Web3 APIs
      sources = [...vectorSources];
      if (web3Context?.sources) {
        sources.push(...web3Context.sources);
      }
    } catch (error) {
      // If LLM fails, check if it's due to missing API key
      if (error.message.includes('API key')) {
        llmContent = `To use this feature, please configure your LLM API key in the backend/.env file. Error: ${error.message}`;
      } else {
        throw error;
      }
    }

    const response = {
      content: llmContent || `You said: "${message}". Please configure LLM API key.`,
      sources
    };

    res.json(response);
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Vector store management endpoints
// Add a document to the vector store
app.post('/api/documents', async (req, res) => {
  try {
    const { content, metadata } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const docId = await addDocument(content, metadata || {});
    res.json({ 
      success: true, 
      id: docId,
      message: 'Document added to vector store'
    });
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get all documents (for debugging)
app.get('/api/documents', async (req, res) => {
  try {
    const documents = await getAllDocuments();
    res.json({ documents });
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  logger.success(`Server running on http://localhost:${PORT}`);
  logger.info('API Endpoints:');
  logger.info('  POST /api/chat - Chat with AI');
  logger.info('  POST /api/documents - Add document to vector store');
  logger.info('  GET /api/documents - List all documents');
  logger.info('  GET /health - Health check');
});

