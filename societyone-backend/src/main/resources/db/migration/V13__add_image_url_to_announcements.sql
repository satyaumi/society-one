-- V13__add_image_url_to_announcements.sql
-- Add image_url to announcements for rich banners and event posters

ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(1024) NULL;
