import express from 'express';
import cors from 'cors';
import { testConnection } from './config/database.js';
import { handleChat, handleChatStream } from './controllers/chat.js';
import { addDocumentHandler, getAllDocumentsHandler } from './controllers/document.js';
import { validateChatRequest, validateDocumentRequest } from './utils/validation.js';
import { errorHandler } from './utils/errors.js';
import { logger } from './utils/logger.js';
import { validateEnvironment } from './utils/envValidator.js';

// Validate environment variables on startup
try {
  validateEnvironment();
} catch (error) {
  logger.error('Failed to start server:', error.message);
  process.exit(1);
}

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

// Chat endpoints (with validation)
app.post('/api/chat', validateChatRequest, handleChat);
app.post('/api/chat/stream', validateChatRequest, handleChatStream);

// Vector store management endpoints (with validation)
app.post('/api/documents', validateDocumentRequest, addDocumentHandler);
app.get('/api/documents', getAllDocumentsHandler);

// Error handler middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.success(`Server running on http://localhost:${PORT}`);
  logger.info('API Endpoints:');
  logger.info('  POST /api/chat - Chat with AI (non-streaming)');
  logger.info('  POST /api/chat/stream - Chat with AI (streaming)');
  logger.info('  POST /api/documents - Add document to vector store');
  logger.info('  GET /api/documents - List all documents');
  logger.info('  GET /health - Health check');
});

