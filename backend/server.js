import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getLLMResponse } from './services/llm.js';
import { searchWeb3Context } from './services/web3.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`Received message: ${message}`);

    // Fetch relevant Web3 context
    const web3Context = await searchWeb3Context(message);
    const context = web3Context?.relevantData || '';

    // Get LLM response
    let llmContent;
    let sources = [];
    
    try {
      llmContent = await getLLMResponse(message, context);
      
      // Add sources if available
      if (web3Context?.sources) {
        sources = web3Context.sources;
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

