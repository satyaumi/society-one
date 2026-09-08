-- V19: Allow NULL actor_user_id in audit_logs for public / system operations (e.g. public society registration, public online visitor pass)
ALTER TABLE audit_logs ALTER COLUMN actor_user_id DROP NOT NULL;
