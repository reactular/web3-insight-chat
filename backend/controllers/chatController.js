/**
 * Chat Controller
 * Handles chat-related endpoints
 */

import { getLLMResponse } from '../services/llm.js';
import { searchWeb3Context } from '../services/web3.js';
import { searchSimilar } from '../services/vectorStore.js';
import { logger } from '../utils/logger.js';

/**
 * Process chat message
 */
export async function handleChat(req, res) {
  try {
    const { message } = req.body;
    // Validation already done by middleware, but keep for safety
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    logger.info(`Received message: ${message}`);

    // Step 1: Search vector store for relevant context
    let vectorContext = '';
    let vectorSources = [];
    try {
      const searchLimit = parseInt(process.env.VECTOR_SEARCH_LIMIT || '3');
      const minSimilarity = parseFloat(process.env.VECTOR_MIN_SIMILARITY || '0.6');
      const similarDocs = await searchSimilar(message, searchLimit, minSimilarity);
      if (similarDocs.length > 0) {
        vectorContext = similarDocs
          .map(doc => `[From stored knowledge]: ${doc.content}`)
          .join('\n\n');
        vectorSources = similarDocs.map(doc => ({
          name: doc.metadata?.title || doc.metadata?.source || 'Stored Knowledge',
          url: doc.metadata?.url || '#'
        }));
        logger.info(`Found ${similarDocs.length} relevant documents from vector store`);
      }
    } catch (error) {
      // Vector store might be empty or unavailable - continue without it
      logger.debug('Vector store search failed (might be empty):', error.message);
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
    logger.error('Error processing chat:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

