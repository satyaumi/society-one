-- V12__create_announcements_and_user_states.sql
-- Production announcement system with audience targeting and per-user read/dismiss state

CREATE TABLE IF NOT EXISTS announcements (
    id                  BIGSERIAL PRIMARY KEY,
    title               VARCHAR(200) NOT NULL,
    message             TEXT NOT NULL,
    type                VARCHAR(50) NOT NULL,
    audience            VARCHAR(50) NOT NULL,
    society_id          BIGINT NULL,
    created_by_user_id  BIGINT NOT NULL,
    event_date          DATE NULL,
    event_time          VARCHAR(50) NULL,
    purpose             VARCHAR(255) NULL,
    expires_at          TIMESTAMPTZ NULL,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    pinned              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE announcements
    ADD CONSTRAINT fk_announcements_society
    FOREIGN KEY (society_id) REFERENCES societies(id)
    ON DELETE SET NULL;

ALTER TABLE announcements
    ADD CONSTRAINT fk_announcements_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    ON DELETE RESTRICT;

ALTER TABLE announcements
    ADD CONSTRAINT chk_announcements_audience
    CHECK (audience IN ('ALL_MEMBERS', 'RESIDENTS', 'SECURITY', 'PUBLIC'));

ALTER TABLE announcements
    ADD CONSTRAINT chk_announcements_type
    CHECK (type IN ('GENERAL_NOTICE', 'EVENT', 'FESTIVAL', 'IMPORTANT_NOTICE', 'MAINTENANCE', 'SECURITY_ALERT', 'DELIVERY', 'OTHER'));

ALTER TABLE announcements
    ADD CONSTRAINT chk_announcements_title_nonempty
    CHECK (LENGTH(TRIM(title)) > 0);

ALTER TABLE announcements
    ADD CONSTRAINT chk_announcements_message_nonempty
    CHECK (LENGTH(TRIM(message)) > 0);

CREATE INDEX IF NOT EXISTS idx_announcements_audience_active
    ON announcements (audience, active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_expires_at
    ON announcements (expires_at);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at
    ON announcements (created_at DESC);

CREATE TABLE IF NOT EXISTS user_announcement_states (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    announcement_id     BIGINT NOT NULL,
    read_at             TIMESTAMPTZ NULL,
    dismissed_at        TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_announcement UNIQUE (user_id, announcement_id)
);

ALTER TABLE user_announcement_states
    ADD CONSTRAINT fk_user_announcement_states_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE;

ALTER TABLE user_announcement_states
    ADD CONSTRAINT fk_user_announcement_states_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements(id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_announcement_states_user
    ON user_announcement_states (user_id, read_at);
