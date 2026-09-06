-- V7__create_notifications.sql
-- Database-backed notification system for SocietyOne workflow events

CREATE TABLE IF NOT EXISTS notifications (
    id                  BIGSERIAL PRIMARY KEY,
    recipient_user_id   BIGINT NOT NULL,
    society_id          BIGINT NULL,
    type                VARCHAR(30) NOT NULL,
    title               VARCHAR(200) NOT NULL,
    message             TEXT NOT NULL,
    read                BOOLEAN NOT NULL DEFAULT FALSE,
    visit_request_id    BIGINT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_recipient_user
    FOREIGN KEY (recipient_user_id) REFERENCES users(id)
    ON DELETE CASCADE;

ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_society
    FOREIGN KEY (society_id) REFERENCES societies(id)
    ON DELETE SET NULL;

ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_visit_request
    FOREIGN KEY (visit_request_id) REFERENCES visit_requests(id)
    ON DELETE SET NULL;

ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_type
    CHECK (type IN ('REQUEST', 'APPROVAL', 'ENTRY', 'EXIT', 'SYSTEM'));

ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_title_nonempty
    CHECK (LENGTH(TRIM(title)) > 0);

ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_message_nonempty
    CHECK (LENGTH(TRIM(message)) > 0);

CREATE INDEX IF NOT EXISTS idx_notifs_recipient_read_created
    ON notifications (recipient_user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifs_society
    ON notifications (society_id);

CREATE INDEX IF NOT EXISTS idx_notifs_visit_request
    ON notifications (visit_request_id);
