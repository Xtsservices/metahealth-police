-- Migration: Add approval and rejection tracking columns
-- Version: 006
-- Created: 2025-07-15
-- Purpose: Add approved_date, approved_by, rejected_date, rejected_by, rejection_reason columns

BEGIN;

-- Add approval and rejection columns to hospitals table
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS rejected_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS rejected_by UUID;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add approval and rejection columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_by UUID;

-- Note: Foreign key constraints for approved_by and rejected_by will be added separately if needed
-- They reference users.id but may cause circular dependency issues

COMMIT;
