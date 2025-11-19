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
import { getEmbedding, getEmbeddings } from './embeddings.js';
import { logger } from '../utils/logger.js';

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
    logger.debug('Generating embedding for document...');
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

    logger.info(`Document added with ID: ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error adding document:', error);
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
    logger.info(`Generating embeddings for ${documents.length} documents...`);
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

    logger.info(`Added ${ids.length} documents to vector store`);
    return ids;
  } catch (error) {
    logger.error('Error adding documents:', error);
    throw error;
  }
}

/**
 * Searches for documents similar to the query with optional metadata filtering
 * 
 * @param {string} query - The search query text
 * @param {number} limit - Maximum number of results (default: 5)
 * @param {number} minSimilarity - Minimum similarity score threshold (0-1, default: 0.6)
 * @param {object} metadataFilter - Optional metadata filter object
 *   Examples:
 *   - { source: 'CoinDesk' } - Filter by exact source
 *   - { source: { $in: ['CoinDesk', 'Benzinga'] } } - Filter by multiple sources
 *   - { title: { $like: '%Ethereum%' } } - Filter by title pattern
 * @returns {Promise<Array<{id: number, content: string, metadata: object, similarity: number}>>}
 */
export async function searchSimilar(
  query, 
  limit = parseInt(process.env.VECTOR_SEARCH_LIMIT || '5'), 
  minSimilarity = parseFloat(process.env.VECTOR_MIN_SIMILARITY || '0.6'),
  metadataFilter = {}
) {
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  const expansionEnabled = process.env.QUERY_EXPANSION_ENABLED !== 'false';
  const maxVariants = Math.max(
    1,
    parseInt(process.env.QUERY_EXPANSION_MAX_VARIANTS || '3')
  );

  const queries = expansionEnabled
    ? generateQueryVariants(query, maxVariants)
    : [query.trim()];

  logger.debug(
    expansionEnabled
      ? `Query expansion enabled. Variants: ${queries.length}`
      : 'Query expansion disabled'
  );

  try {
    const { filterConditions, filterParams } = buildMetadataFilter(metadataFilter);

    const resultsMap = new Map();

    for (const variant of queries) {
      logger.debug(`Searching with variant: "${variant}"`);
      const queryEmbedding = await getEmbedding(variant);

      const whereClause = [`1 - (embedding <=> $1::vector) >= $2`, ...filterConditions];

      const searchQuery = `
        SELECT 
          id,
          content,
          metadata,
          1 - (embedding <=> $1::vector) AS similarity
        FROM document_embeddings
        WHERE ${whereClause.join(' AND ')}
        ORDER BY embedding <=> $1::vector
        LIMIT $3
      `;

      const result = await pool.query(searchQuery, [
        `[${queryEmbedding.join(',')}]`,
        minSimilarity,
        limit,
        ...filterParams
      ]);

      result.rows.forEach(row => {
        const existing = resultsMap.get(row.id);
        const similarity = parseFloat(row.similarity);

        if (!existing || similarity > existing.similarity) {
          resultsMap.set(row.id, {
            id: row.id,
            content: row.content,
            metadata: row.metadata,
            similarity
          });
        }
      });
    }

    const combinedResults = Array.from(resultsMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    logger.info(
      `Found ${combinedResults.length} unique documents` +
      `${filterConditions.length > 0 ? ' with metadata filters' : ''}` +
      `${queries.length > 1 ? ` (from ${queries.length} variants)` : ''}`
    );

    return combinedResults;
  } catch (error) {
    logger.error('Error searching documents:', error);
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
    logger.error('Error getting documents:', error);
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
    logger.error('Error deleting document:', error);
    throw error;
  }
}

/**
 * Builds SQL clauses for metadata filtering
 */
function buildMetadataFilter(metadataFilter = {}) {
  const filterConditions = [];
  const filterParams = [];
  let paramIndex = 4; // After embedding, similarity, limit

  const isValidKey = (key) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);

  if (!metadataFilter || Object.keys(metadataFilter).length === 0) {
    return { filterConditions, filterParams };
  }

  for (const [key, value] of Object.entries(metadataFilter)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (!isValidKey(key)) {
      logger.warn(`Invalid metadata key name: ${key}. Skipping filter.`);
      continue;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      filterConditions.push(`metadata->>'${key}' = $${paramIndex}`);
      filterParams.push(String(value));
      paramIndex++;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      for (const [op, opValue] of Object.entries(value)) {
        if (op === '$in' && Array.isArray(opValue)) {
          if (opValue.length === 0) {
            continue;
          }
          const placeholders = opValue.map((_, i) => `$${paramIndex + i}`).join(', ');
          filterConditions.push(`metadata->>'${key}' IN (${placeholders})`);
          filterParams.push(...opValue.map(v => String(v)));
          paramIndex += opValue.length;
        } else if ((op === '$like' || op === '$ilike') && typeof opValue === 'string') {
          const likeOp = op === '$ilike' ? 'ILIKE' : 'LIKE';
          filterConditions.push(`metadata->>'${key}' ${likeOp} $${paramIndex}`);
          filterParams.push(String(opValue));
          paramIndex++;
        } else if (op === '$exists') {
          if (opValue) {
            filterConditions.push(`metadata ? '${key}'`);
          } else {
            filterConditions.push(`NOT (metadata ? '${key}')`);
          }
        }
      }
    }
  }

  return { filterConditions, filterParams };
}

/**
 * Generates query variants for expansion
 */
function generateQueryVariants(query, maxVariants = 3) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const variants = new Set([trimmed]);
  const normalized = trimmed.replace(/\?+$/, '');
  const lower = normalized.toLowerCase();

  const templates = [
    `What is ${normalized}?`,
    `Explain ${normalized}`,
    `Detailed overview of ${normalized}`,
    `How does ${normalized} work?`,
    `Key facts about ${normalized}`
  ];

  templates.forEach(template => {
    if (variants.size >= maxVariants) {
      return;
    }
    // Avoid duplicates if template equals existing variant
    if (!variants.has(template)) {
      variants.add(template);
    }
  });

  // If query already in question form, add statement variant
  if ((lower.startsWith('what is ') || lower.startsWith('who is ') || lower.startsWith('tell me about ')) && variants.size < maxVariants) {
    variants.add(normalized);
  }

  return Array.from(variants).slice(0, maxVariants);
}

/**
 * Gets unique values for a metadata field (useful for building filter UIs)
 * 
 * @param {string} metadataKey - The metadata key to get unique values for (e.g., 'source', 'title')
 * @returns {Promise<string[]>} - Array of unique values
 */
export async function getMetadataValues(metadataKey) {
  if (!metadataKey || typeof metadataKey !== 'string') {
    throw new Error('Metadata key must be a non-empty string');
  }

  // Validate key name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(metadataKey)) {
    throw new Error('Invalid metadata key name');
  }

  try {
    const query = `
      SELECT DISTINCT metadata->>'${metadataKey}' AS value
      FROM document_embeddings
      WHERE metadata->>'${metadataKey}' IS NOT NULL
      ORDER BY value
    `;

    const result = await pool.query(query);
    return result.rows.map(row => row.value).filter(Boolean);
  } catch (error) {
    logger.error('Error getting metadata values:', error);
    throw error;
  }
}

/**
 * Helper function to create common metadata filters
 * 
 * @example
 * // Filter by source
 * searchSimilar(query, 5, 0.6, createMetadataFilter({ source: 'CoinDesk' }));
 * 
 * // Filter by multiple sources
 * searchSimilar(query, 5, 0.6, createMetadataFilter({ source: ['CoinDesk', 'Benzinga'] }));
 * 
 * // Filter by title pattern
 * searchSimilar(query, 5, 0.6, createMetadataFilter({ title: { like: '%Ethereum%' } }));
 */
export function createMetadataFilter(filters) {
  const result = {};
  
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    // Handle array values as $in operator
    if (Array.isArray(value)) {
      result[key] = { $in: value };
    }
    // Handle objects with 'like' or 'ilike' shorthand
    else if (typeof value === 'object' && value.like !== undefined) {
      result[key] = { $like: value.like };
    }
    else if (typeof value === 'object' && value.ilike !== undefined) {
      result[key] = { $ilike: value.ilike };
    }
    // Handle simple values
    else {
      result[key] = value;
    }
  }
  
  return result;
}

