/**
 * Metadata Filtering Examples
 * 
 * This file demonstrates how to use metadata filtering in vector search.
 * These are examples - not meant to be executed directly.
 */

import { searchSimilar, createMetadataFilter, getMetadataValues } from './vectorStore.js';

// Example 1: Simple filter by source
async function example1() {
  const results = await searchSimilar(
    'What is DeFi?',
    5,
    0.6,
    { source: 'CoinDesk' }
  );
  // Returns only documents from CoinDesk
}

// Example 2: Filter by multiple sources
async function example2() {
  const results = await searchSimilar(
    'Ethereum updates',
    5,
    0.6,
    { source: { $in: ['CoinDesk', 'Benzinga'] } }
  );
  // Returns documents from either CoinDesk or Benzinga
}

// Example 3: Using helper function for cleaner syntax
async function example3() {
  const filter = createMetadataFilter({
    source: ['CoinDesk', 'Benzinga'], // Automatically converts to $in
    title: { like: '%Ethereum%' }     // Automatically converts to $like
  });
  
  const results = await searchSimilar(
    'Ethereum smart contracts',
    5,
    0.6,
    filter
  );
}

// Example 4: Filter by title pattern (case-insensitive)
async function example4() {
  const results = await searchSimilar(
    'blockchain technology',
    5,
    0.6,
    { title: { $ilike: '%blockchain%' } }
  );
  // Returns documents with "blockchain" in title (case-insensitive)
}

// Example 5: Check if metadata field exists
async function example5() {
  const results = await searchSimilar(
    'Web3 trends',
    5,
    0.6,
    { url: { $exists: true } }
  );
  // Returns only documents that have a 'url' field in metadata
}

// Example 6: Multiple filters combined
async function example6() {
  const results = await searchSimilar(
    'DeFi protocols',
    5,
    0.6,
    {
      source: 'CoinDesk',
      title: { $like: '%DeFi%' }
    }
  );
  // Returns documents from CoinDesk with "DeFi" in the title
}

// Example 7: Get available filter values
async function example7() {
  const sources = await getMetadataValues('source');
  // Returns: ['CoinDesk', 'Benzinga', 'Web3 Knowledge Base', ...]
  
  const titles = await getMetadataValues('title');
  // Returns all unique titles
}

// Example 8: Use in chat controller with filters
async function example8() {
  // In a chat controller, you could accept filters from request:
  // const { message, filters } = req.body;
  // 
  // const results = await searchSimilar(
  //   message,
  //   5,
  //   0.6,
  //   filters || {}
  // );
}

