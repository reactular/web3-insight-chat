/**
 * Vector Store Service
 * 
 * This service manages the vector database using pgvector.
 * 
 * Core operations:
 * 1. addDocument() - Add a document with its embedding to the database
 * 2. searchSimilar() - Find documents similar to a query using vector similarity
 * 
 * How vector search works:
 * - Query text → embedding vector
 * - Compare query vector with all document vectors
 * - Use cosine similarity (angle between vectors)
 * - Return most similar documents
 */

import { pool } from '../config/database.js';
import { getEmbedding } from './embeddings.js';

/**
 * Adds a document to the vector store
 * 
 * @param {string} content - The text content of the document
 * @param {object} metadata - Optional metadata (title, url, source, etc.)
 * @returns {Promise<number>} - The ID of the inserted document
 */
export async function addDocument(content, metadata = {}) {
  if (!content || content.trim().length === 0) {
    throw new Error('Content cannot be empty');
  }

  try {
    // Step 1: Convert text to embedding vector
    console.log('Generating embedding for document...');
    const embedding = await getEmbedding(content);

    // Step 2: Insert document with embedding into database
    // pgvector accepts the embedding as an array, Postgres converts it to vector type
    const query = `
      INSERT INTO document_embeddings (content, metadata, embedding)
      VALUES ($1, $2, $3::vector)
      RETURNING id
    `;

    const result = await pool.query(query, [
      content,
      JSON.stringify(metadata),
      `[${embedding.join(',')}]` // Convert array to string format for Postgres
    ]);

    console.log(`✅ Document added with ID: ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
}

/**
 * Adds multiple documents in batch (more efficient)
 * 
 * @param {Array<{content: string, metadata?: object}>} documents - Array of documents to add
 * @returns {Promise<number[]>} - Array of inserted document IDs
 */
export async function addDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error('Documents must be a non-empty array');
  }

  try {
    // Generate embeddings for all documents
    console.log(`Generating embeddings for ${documents.length} documents...`);
    const texts = documents.map(doc => doc.content);
    const embeddings = await getEmbeddings(texts);

    // Insert all documents
    const ids = [];
    for (let i = 0; i < documents.length; i++) {
      const { content, metadata = {} } = documents[i];
      const embedding = embeddings[i];

      const query = `
        INSERT INTO document_embeddings (content, metadata, embedding)
        VALUES ($1, $2, $3::vector)
        RETURNING id
      `;

      const result = await pool.query(query, [
        content,
        JSON.stringify(metadata),
        `[${embedding.join(',')}]`
      ]);

      ids.push(result.rows[0].id);
    }

    console.log(`✅ Added ${ids.length} documents to vector store`);
    return ids;
  } catch (error) {
    console.error('Error adding documents:', error);
    throw error;
  }
}

/**
 * Searches for documents similar to the query
 * 
 * @param {string} query - The search query text
 * @param {number} limit - Maximum number of results (default: 5)
 * @param {number} minSimilarity - Minimum similarity score threshold (0-1, default: 0.7)
 * @returns {Promise<Array<{id: number, content: string, metadata: object, similarity: number}>>}
 */
export async function searchSimilar(query, limit = 5, minSimilarity = 0.7) {
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  try {
    // Step 1: Convert query to embedding
    console.log('Generating embedding for query...');
    const queryEmbedding = await getEmbedding(query);

    // Step 2: Search using cosine similarity
    // pgvector's <=> operator calculates cosine distance (0 = identical, 1 = completely different)
    // We use 1 - (distance) to get similarity (1 = identical, 0 = completely different)
    const searchQuery = `
      SELECT 
        id,
        content,
        metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM document_embeddings
      WHERE 1 - (embedding <=> $1::vector) >= $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `;

    const result = await pool.query(searchQuery, [
      `[${queryEmbedding.join(',')}]`,
      minSimilarity,
      limit
    ]);

    console.log(`✅ Found ${result.rows.length} similar documents`);
    
    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      similarity: parseFloat(row.similarity)
    }));
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

/**
 * Gets all documents (for debugging/admin purposes)
 */
export async function getAllDocuments() {
  try {
    const result = await pool.query(
      'SELECT id, content, metadata, created_at FROM document_embeddings ORDER BY created_at DESC'
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
}

/**
 * Deletes a document by ID
 */
export async function deleteDocument(id) {
  try {
    const result = await pool.query(
      'DELETE FROM document_embeddings WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0]?.id;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

