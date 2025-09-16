-- Migration: Add email/password authentication fields to users table

-- Add password column to users table
ALTER TABLE users 
ADD COLUMN password_hash VARCHAR(255),
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN email_verification_token VARCHAR(255),
ADD COLUMN password_reset_token VARCHAR(255),
ADD COLUMN password_reset_expires TIMESTAMP;

-- Make email required for all users (it's already NOT NULL in the schema)
-- ALTER TABLE users 
-- ALTER COLUMN email SET NOT NULL;

-- Create index for email verification and password reset tokens
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
