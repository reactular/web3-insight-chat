/**
 * Embedding Service
 * 
 * This service converts text into vector embeddings using OpenAI's API.
 * 
 * How it works:
 * 1. Takes text as input
 * 2. Sends it to OpenAI's embedding API
 * 3. Returns a vector (array of 1536 numbers)
 * 4. Similar texts will have similar vectors (cosine similarity)
 */

const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_MODEL = 'text-embedding-3-small'; // 1536 dimensions, good balance of quality and cost

/**
 * Converts text to a vector embedding
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - Array of 1536 numbers representing the text
 */
export async function getEmbedding(text) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  try {
    const response = await fetch(OPENAI_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: text.trim()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    // Return the embedding vector (array of 1536 numbers)
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error getting embedding:', error);
    throw error;
  }
}

/**
 * Converts multiple texts to embeddings (batch processing)
 * Useful for adding multiple documents at once
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function getEmbeddings(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts must be a non-empty array');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  try {
    const response = await fetch(OPENAI_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: texts.map(t => t.trim())
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    // Return array of embedding vectors
    return data.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error getting embeddings:', error);
    throw error;
  }
}

