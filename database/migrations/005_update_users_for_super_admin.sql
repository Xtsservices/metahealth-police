-- Migration: Update users table for super admin support
-- Version: 005
-- Created: 2025-07-15
-- Purpose: Allow null hospital_id and add super_admin role

BEGIN;

-- 1. Remove the NOT NULL constraint from hospital_id
ALTER TABLE users ALTER COLUMN hospital_id DROP NOT NULL;

-- 2. Update the role constraint to include super_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('hospital_admin', 'system_admin', 'operator', 'super_admin'));

-- 3. Add last_login column if it doesn't exist (for OTP authentication)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 4. Update foreign key constraint to allow null hospital_id
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_hospital;
ALTER TABLE users ADD CONSTRAINT fk_users_hospital 
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE;

COMMIT;
