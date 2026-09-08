-- V17__add_visitor_email.sql
-- Adds email support to visitors table for online registration visitor notifications

ALTER TABLE visitors ADD COLUMN IF NOT EXISTS email VARCHAR(255);
