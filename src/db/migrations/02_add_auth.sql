-- Migration 02: Add authentication support (password_hash)
ALTER TABLE consumers ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS password_hash TEXT;
