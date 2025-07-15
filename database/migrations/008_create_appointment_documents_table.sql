-- Migration: Create appointment_documents table
-- Version: 008
-- Created: 2025-07-15
-- Purpose: Create appointment_documents table for storing lab reports, prescriptions, and operation sheets

BEGIN;

-- Create appointment_documents table
CREATE TABLE IF NOT EXISTS appointment_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('lab_report', 'prescription', 'operation_sheet', 'other')),
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by VARCHAR(50) NOT NULL, -- 'doctor', 'nurse', 'admin', etc.
    uploaded_by_id UUID, -- User ID who uploaded the document
    description TEXT,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_appointment_documents_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT valid_document_name CHECK (LENGTH(TRIM(document_name)) > 0),
    CONSTRAINT valid_file_path CHECK (LENGTH(TRIM(file_path)) > 0),
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 50000000), -- Max 50MB
    CONSTRAINT valid_mime_type CHECK (LENGTH(TRIM(mime_type)) > 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointment_documents_appointment_id ON appointment_documents(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_documents_type ON appointment_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_appointment_documents_created_date ON appointment_documents(created_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_appointment_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_appointment_documents_updated_at
    BEFORE UPDATE ON appointment_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_appointment_documents_updated_at();

COMMIT;
