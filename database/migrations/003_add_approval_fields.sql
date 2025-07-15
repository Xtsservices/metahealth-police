-- Add approval and rejection fields to hospitals table
ALTER TABLE hospitals 
ADD COLUMN approved_by VARCHAR(36),
ADD COLUMN approved_date TIMESTAMP,
ADD COLUMN rejected_by VARCHAR(36),
ADD COLUMN rejected_date TIMESTAMP,
ADD COLUMN rejection_reason TEXT;

-- Add approval and rejection fields to users table
ALTER TABLE users 
ADD COLUMN approved_by VARCHAR(36),
ADD COLUMN approved_date TIMESTAMP,
ADD COLUMN rejected_by VARCHAR(36),
ADD COLUMN rejected_date TIMESTAMP;

-- Update status enum to include 'rejected' status
-- Note: In PostgreSQL, we need to add new enum values if using ENUM type
-- For VARCHAR status fields, this is already supported

-- Add foreign key constraints for approval tracking (optional)
-- ALTER TABLE hospitals ADD CONSTRAINT fk_hospitals_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);
-- ALTER TABLE hospitals ADD CONSTRAINT fk_hospitals_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id);
-- ALTER TABLE users ADD CONSTRAINT fk_users_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);
-- ALTER TABLE users ADD CONSTRAINT fk_users_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id);
