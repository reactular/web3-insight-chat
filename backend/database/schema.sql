-- Step 2: Database Schema with pgvector
--
-- This SQL file sets up:
-- 1. The pgvector extension (enables vector operations in Postgres)
-- 2. A table to store document chunks with their embeddings
--
-- Run this after creating your database:
-- psql -U postgres -d web3_insight -f backend/database/schema.sql

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for storing documents and their embeddings
-- Each row represents a chunk of text (document) with its vector embedding
CREATE TABLE IF NOT EXISTS document_embeddings (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,              -- The actual text content
    metadata JSONB,                     -- Store additional info (source, title, url, etc.)
    embedding vector(1536),             -- OpenAI embeddings are 1536 dimensions
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create an index for fast similarity search
-- This uses HNSW (Hierarchical Navigable Small World) algorithm for efficient vector search
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
ON document_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Create index on metadata for filtering
CREATE INDEX IF NOT EXISTS document_embeddings_metadata_idx 
ON document_embeddings 
USING GIN (metadata);

-- Helper function to search similar documents
-- This will be used by our vector store service
-- Returns documents ordered by similarity (cosine distance)
COMMENT ON TABLE document_embeddings IS 'Stores document chunks with vector embeddings for semantic search';

