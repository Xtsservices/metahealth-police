-- Migration: Create patients table
-- Version: 006
-- Created: 2025-07-15
-- Purpose: Create patients table for patient management

BEGIN;

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL UNIQUE,
    aadhar VARCHAR(20) NOT NULL UNIQUE,
    police_id_no VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_patient_name CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT valid_patient_mobile CHECK (LENGTH(TRIM(mobile)) >= 10),
    CONSTRAINT valid_patient_aadhar CHECK (LENGTH(TRIM(aadhar)) >= 12),
    CONSTRAINT valid_police_id CHECK (LENGTH(TRIM(police_id_no)) > 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
CREATE INDEX IF NOT EXISTS idx_patients_aadhar ON patients(aadhar);
CREATE INDEX IF NOT EXISTS idx_patients_police_id ON patients(police_id_no);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_created_date ON patients(created_date);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON patients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
