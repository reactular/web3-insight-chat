/**
 * Database Setup Script
 * 
 * This script automatically sets up the database schema.
 * Run it once to initialize your database with pgvector.
 * 
 * Usage: node backend/database/setup.js
 */

import { pool, testConnection } from '../config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database schema...\n');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to database. Please check your .env file.');
      process.exit(1);
    }

    // Read and execute schema.sql
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf8');

    // Execute each statement
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('COMMENT')) {
        // Skip COMMENT statements for now
        continue;
      }
      await pool.query(statement);
      console.log('✅ Executed:', statement.substring(0, 50) + '...');
    }

    console.log('\n✨ Database setup complete!');
    console.log('📊 You can now use the vector store to add and search documents.\n');

    // Verify pgvector extension
    const extResult = await pool.query(
      "SELECT * FROM pg_extension WHERE extname = 'vector'"
    );
    if (extResult.rows.length > 0) {
      console.log('✅ pgvector extension is enabled');
    } else {
      console.log('⚠️  Warning: pgvector extension may not be installed');
    }

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();

