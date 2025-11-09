/**
 * Import Documents Script
 * 
 * Reads documents from a JSON file and imports them into the vector store.
 * Uses the existing vectorStore service to handle embeddings and database operations.
 * 
 * Usage: node backend/database/import-documents.js [path/to/documents.json]
 * Default: backend/data/documents.json
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { addDocuments } from '../services/vectorStore.js';
import { testConnection } from '../config/database.js';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function importDocuments() {
  try {
    // Get JSON file path from command line or use default
    const jsonPath = process.argv[2] || join(__dirname, '../data/documents.json');
    
    console.log('📚 Importing documents from:', jsonPath);
    console.log('');

    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to database. Please check your .env file.');
      process.exit(1);
    }

    // Read and parse JSON file
    let documents;
    try {
      const fileContent = readFileSync(jsonPath, 'utf8');
      documents = JSON.parse(fileContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`❌ File not found: ${jsonPath}`);
        console.error('   Please create the JSON file or specify a different path.');
      } else if (error instanceof SyntaxError) {
        console.error(`❌ Invalid JSON in file: ${jsonPath}`);
        console.error('   Error:', error.message);
      } else {
        console.error(`❌ Error reading file: ${error.message}`);
      }
      process.exit(1);
    }

    // Validate documents array
    if (!Array.isArray(documents)) {
      console.error('❌ JSON file must contain an array of documents');
      process.exit(1);
    }

    if (documents.length === 0) {
      console.error('❌ JSON file is empty');
      process.exit(1);
    }

    // Validate each document
    const errors = [];
    documents.forEach((doc, index) => {
      if (!doc.content || typeof doc.content !== 'string') {
        errors.push(`Document ${index + 1}: missing or invalid 'content' field`);
      }
      if (doc.metadata && typeof doc.metadata !== 'object') {
        errors.push(`Document ${index + 1}: 'metadata' must be an object`);
      }
    });

    if (errors.length > 0) {
      console.error('❌ Validation errors:');
      errors.forEach(err => console.error(`   - ${err}`));
      process.exit(1);
    }

    console.log(`✅ Found ${documents.length} document(s) to import`);
    console.log('');

    // Import documents using existing vectorStore service
    console.log('🔄 Generating embeddings and inserting documents...');
    const ids = await addDocuments(documents);

    console.log('');
    console.log('✨ Import complete!');
    console.log(`✅ Successfully imported ${ids.length} document(s)`);
    console.log(`📝 Document IDs: ${ids.join(', ')}`);

  } catch (error) {
    console.error('❌ Error importing documents:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importDocuments();

