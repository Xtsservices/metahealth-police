-- Migration 009: Modify appointment_documents table to store base64 data
-- This migration changes the storage from file paths to base64 data in the database

-- Add the new file_data column for base64 storage
ALTER TABLE appointment_documents 
ADD COLUMN file_data TEXT;

-- Update the file_path column to be nullable (we'll remove it later)
ALTER TABLE appointment_documents 
ALTER COLUMN file_path DROP NOT NULL;

-- Add a comment to the table explaining the new structure
COMMENT ON COLUMN appointment_documents.file_data IS 'Base64 encoded file content';
COMMENT ON COLUMN appointment_documents.file_path IS 'DEPRECATED: File path, replaced by file_data column';

-- Create an index on document type for faster queries
CREATE INDEX IF NOT EXISTS idx_appointment_documents_type ON appointment_documents(document_type);

-- Create an index on appointment_id for faster queries
CREATE INDEX IF NOT EXISTS idx_appointment_documents_appointment ON appointment_documents(appointment_id);
