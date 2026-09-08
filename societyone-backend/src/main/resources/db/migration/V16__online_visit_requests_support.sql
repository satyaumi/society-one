-- V16: Support Online Visit requests with optional flat_id for Admin and Society Management visits
ALTER TABLE visit_requests ALTER COLUMN flat_id DROP NOT NULL;
