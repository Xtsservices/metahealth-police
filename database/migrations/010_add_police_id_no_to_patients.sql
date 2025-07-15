-- Migration: Add police_id_no column to patients table
-- Version: 010
-- Created: 2025-07-15
-- Purpose: Add mandatory and unique police_id_no column to patients table

BEGIN;

-- Add police_id_no column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS police_id_no VARCHAR(50);

-- Update existing records with a placeholder value (you may want to update this with real data)
UPDATE patients SET police_id_no = 'TEMP_' || id::text WHERE police_id_no IS NULL;

-- Make the column NOT NULL and UNIQUE
ALTER TABLE patients ALTER COLUMN police_id_no SET NOT NULL;
ALTER TABLE patients ADD CONSTRAINT unique_police_id_no UNIQUE (police_id_no);

-- Add constraint for validation
ALTER TABLE patients ADD CONSTRAINT valid_police_id_no CHECK (LENGTH(TRIM(police_id_no)) > 0);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_police_id_no ON patients(police_id_no);

COMMIT;
