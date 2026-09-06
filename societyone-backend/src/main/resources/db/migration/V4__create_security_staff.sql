CREATE TABLE security_staff_profiles (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL UNIQUE,
    society_id BIGINT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_security_staff_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_security_staff_society
        FOREIGN KEY (society_id)
        REFERENCES societies(id)
        ON DELETE CASCADE,

    CONSTRAINT ck_security_staff_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_security_staff_society_id
    ON security_staff_profiles(society_id);

CREATE INDEX idx_security_staff_user_id
    ON security_staff_profiles(user_id);