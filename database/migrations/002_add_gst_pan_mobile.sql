-- Migration: Update hospitals table with GST, PAN and enhanced contact info
-- Version: 002
-- Created: 2025-07-15

BEGIN;

-- Add new columns to existing hospitals table
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15),
ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10),
ADD COLUMN IF NOT EXISTS contact_country_code VARCHAR(5),
ADD COLUMN IF NOT EXISTS contact_mobile VARCHAR(20);

-- Update existing records with default values
UPDATE hospitals 
SET 
    gst_number = 'GST' || SUBSTRING(license_number FROM 1 FOR 12) 
WHERE gst_number IS NULL;

UPDATE hospitals 
SET 
    pan_number = 'PAN' || SUBSTRING(license_number FROM 1 FOR 7) 
WHERE pan_number IS NULL;

UPDATE hospitals 
SET 
    contact_country_code = '+1',
    contact_mobile = contact_phone 
WHERE contact_country_code IS NULL;

-- Add constraints
ALTER TABLE hospitals 
ADD CONSTRAINT unique_gst_number UNIQUE (gst_number),
ADD CONSTRAINT unique_pan_number UNIQUE (pan_number),
ADD CONSTRAINT valid_gst_length CHECK (LENGTH(gst_number) = 15),
ADD CONSTRAINT valid_pan_length CHECK (LENGTH(pan_number) = 10);

-- Make new fields NOT NULL
ALTER TABLE hospitals 
ALTER COLUMN gst_number SET NOT NULL,
ALTER COLUMN pan_number SET NOT NULL,
ALTER COLUMN contact_country_code SET NOT NULL,
ALTER COLUMN contact_mobile SET NOT NULL;

-- Update the default status for new registrations
ALTER TABLE hospitals 
ALTER COLUMN status SET DEFAULT 'inactive';

COMMIT;
