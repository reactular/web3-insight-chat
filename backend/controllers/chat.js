/**
 * Chat Controller
 * Handles chat-related endpoints
 */

import { getLLMResponse, streamLLMResponse } from '../services/llm.js';
import { searchWeb3Context } from '../services/web3.js';
import { searchSimilar } from '../services/vectorStore.js';
import { logger } from '../utils/logger.js';

/**
 * Process chat message (non-streaming)
 */
export async function handleChat(req, res, filters = {}) {
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
      const similarDocs = await searchSimilar(message, searchLimit, minSimilarity, filters);
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

/**
 * Process chat message with streaming response (Server-Sent Events)
 */
export async function handleChatStream(req, res, filters = {}) {
  try {
    const { message } = req.body;
    // Validation already done by middleware, but keep for safety
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    logger.info(`Received streaming message: ${message}`);

    // Set up Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Helper function to send SSE data
    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Step 1: Search vector store for relevant context
    let vectorContext = '';
    let vectorSources = [];
    try {
      const searchLimit = parseInt(process.env.VECTOR_SEARCH_LIMIT || '3');
      const minSimilarity = parseFloat(process.env.VECTOR_MIN_SIMILARITY || '0.6');
      const similarDocs = await searchSimilar(message, searchLimit, minSimilarity, filters);
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

    // Send sources first (before streaming starts)
    const sources = [...vectorSources];
    if (web3Context?.sources) {
      sources.push(...web3Context.sources);
    }
    sendEvent('sources', { sources });

    // Step 4: Stream LLM response
    try {
      sendEvent('start', { message: 'Starting response...' });
      
      let fullContent = '';
      for await (const chunk of streamLLMResponse(message, combinedContext)) {
        fullContent += chunk;
        sendEvent('chunk', { content: chunk });
      }

      sendEvent('done', { 
        message: 'Response complete',
        fullContent 
      });
    } catch (error) {
      logger.error('Error streaming LLM response:', error);
      
      let errorMessage = 'An error occurred while generating the response.';
      if (error.message.includes('API key')) {
        errorMessage = `To use this feature, please configure your LLM API key in the backend/.env file. Error: ${error.message}`;
      }
      
      sendEvent('error', { error: errorMessage });
    } finally {
      res.end();
    }
  } catch (error) {
    logger.error('Error processing streaming chat:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    } else {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: error.message || 'Internal server error' })}\n\n`);
      res.end();
    }
  }
}

