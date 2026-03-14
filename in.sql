-- If you already created the table, you can ALTER it:
ALTER TABLE documents
  ALTER COLUMN content TYPE BYTEA USING content::bytea;

-- Or drop and create:
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content BYTEA NOT NULL,
  metadata JSONB,
  embedding vector(1536),
  file_path TEXT NULL,
  file_url TEXT NULL
);

-- Enable the vector extension for embeddings
-- This extension allows PostgreSQL to store and search vector data efficiently
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the documents table
-- This table stores document chunks, their metadata, and embeddings
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536)  -- OpenAI's text-embedding-3-small produces 1536-dimensional vectors
  file_path text null,
  file_url text null,
);

-- Create an index on the embedding column for faster similarity search
-- The ivfflat index speeds up vector similarity queries
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);

-- Create a function for matching documents based on similarity
-- This function finds the most similar document chunks to a query embedding
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;-- If you already created the table, you can ALTER it:
ALTER TABLE documents
  ALTER COLUMN content TYPE BYTEA USING content::bytea;

-- Or drop and create:
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content BYTEA NOT NULL,
  metadata JSONB,
  embedding vector(1536),
  file_path TEXT NULL,
  file_url TEXT NULL
);