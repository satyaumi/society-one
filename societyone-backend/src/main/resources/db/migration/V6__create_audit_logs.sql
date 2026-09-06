-- V6__create_audit_logs.sql
-- Database-backed audit log system for SocietyOne

CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    actor_user_id   BIGINT NOT NULL,
    society_id      BIGINT NULL,
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(60) NULL,
    entity_id       BIGINT NULL,
    description     TEXT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_logs_actor_user
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
    ON DELETE RESTRICT;

ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_logs_society
    FOREIGN KEY (society_id) REFERENCES societies(id)
    ON DELETE SET NULL;

ALTER TABLE audit_logs
    ADD CONSTRAINT chk_audit_logs_action_nonempty
    CHECK (LENGTH(TRIM(action)) > 0);

CREATE INDEX IF NOT EXISTS idx_audit_logs_society_created
    ON audit_logs (society_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
    ON audit_logs (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
    ON audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
    ON audit_logs (entity_type, entity_id);
