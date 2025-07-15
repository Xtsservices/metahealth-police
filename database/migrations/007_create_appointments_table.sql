-- Migration: Create appointments table
-- Version: 007
-- Created: 2025-07-15
-- Purpose: Create appointments table for patient-hospital appointments

BEGIN;

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL,
    hospital_id UUID NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    purpose TEXT NOT NULL,
    notes TEXT,
    created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT fk_appointments_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT valid_appointment_purpose CHECK (LENGTH(TRIM(purpose)) > 0),
    CONSTRAINT valid_appointment_date CHECK (appointment_date >= CURRENT_DATE),
    
    -- Unique constraint to prevent duplicate appointments for same patient at same time
    CONSTRAINT unique_patient_appointment UNIQUE (patient_id, appointment_date, appointment_time)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_created_date ON appointments(created_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_date ON appointments(hospital_id, appointment_date);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
