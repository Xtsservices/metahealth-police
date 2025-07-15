-- MetaHealth Police Database Schema
-- PostgreSQL Database Setup

-- Create database (run this separately as superuser)
-- CREATE DATABASE metahealth_police;

-- Connect to the database and create schema
\c metahealth_police;

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create hospitals table
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    
    -- Address fields
    address_street VARCHAR(255) NOT NULL,
    address_city VARCHAR(100) NOT NULL,
    address_state VARCHAR(50) NOT NULL,
    address_zip_code VARCHAR(20) NOT NULL,
    address_country VARCHAR(50) NOT NULL DEFAULT 'USA',
    
    -- Contact information
    contact_phone VARCHAR(20) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_website VARCHAR(255),
    
    -- Metadata
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_name CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT valid_license CHECK (LENGTH(TRIM(license_number)) > 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_hospitals_license_number ON hospitals(license_number);
CREATE INDEX idx_hospitals_name ON hospitals(name);
CREATE INDEX idx_hospitals_status ON hospitals(status);
CREATE INDEX idx_hospitals_city_state ON hospitals(address_city, address_state);
CREATE INDEX idx_hospitals_registration_date ON hospitals(registration_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_hospitals_updated_at 
    BEFORE UPDATE ON hospitals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO hospitals (
    name, 
    license_number, 
    address_street, 
    address_city, 
    address_state, 
    address_zip_code, 
    address_country,
    contact_phone, 
    contact_email, 
    contact_website
) VALUES 
(
    'Metropolitan General Hospital',
    'NYC-HOSP-2024-001',
    '123 Healthcare Boulevard',
    'Metro City',
    'NY',
    '10001',
    'USA',
    '+1-555-123-4567',
    'info@metrogeneralhospital.com',
    'https://www.metrogeneralhospital.com'
),
(
    'Central Medical Center',
    'CAL-HOSP-2024-002',
    '456 Medical Drive',
    'Los Angeles',
    'CA',
    '90210',
    'USA',
    '+1-555-987-6543',
    'contact@centralmedical.org',
    'https://www.centralmedical.org'
);

-- Create a view for easy querying
CREATE VIEW hospital_summary AS
SELECT 
    id,
    name,
    license_number,
    CONCAT(address_street, ', ', address_city, ', ', address_state, ' ', address_zip_code) as full_address,
    contact_phone,
    contact_email,
    status,
    registration_date
FROM hospitals
ORDER BY registration_date DESC;
