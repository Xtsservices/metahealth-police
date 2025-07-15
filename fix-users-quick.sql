-- Quick fix for users table to support super admin
-- Run this SQL in your PostgreSQL client

-- 1. Remove the NOT NULL constraint from hospital_id
ALTER TABLE users ALTER COLUMN hospital_id DROP NOT NULL;

-- 2. Update the role constraint to include super_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('hospital_admin', 'system_admin', 'operator', 'super_admin'));

-- 3. Add last_login column if it doesn't exist (for OTP authentication)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
