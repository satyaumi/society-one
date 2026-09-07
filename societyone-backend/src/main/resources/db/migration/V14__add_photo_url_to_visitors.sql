-- V14__add_photo_url_to_visitors.sql
-- Add reusable photo_url to visitors table for online, resident, security walk-in, and regular visitors

ALTER TABLE visitors
    ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_visitors_photo_url
    ON visitors (photo_url)
    WHERE photo_url IS NOT NULL;
