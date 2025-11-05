/**
 * Document Controller
 * Handles vector store document management endpoints
 */

import { addDocument, getAllDocuments } from '../services/vectorStore.js';

/**
 * Add a document to the vector store
 */
export async function addDocumentHandler(req, res) {
  try {
    const { content, metadata } = req.body;
    // Validation already done by middleware, but keep for safety
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
}

/**
 * Get all documents (for debugging/admin)
 */
export async function getAllDocumentsHandler(req, res) {
  try {
    const documents = await getAllDocuments();
    res.json({ documents });
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

