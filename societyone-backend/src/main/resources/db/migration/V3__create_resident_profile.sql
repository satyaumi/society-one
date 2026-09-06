CREATE TABLE resident_profiles (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL UNIQUE,
    flat_id BIGINT NOT NULL,

    resident_type VARCHAR(30) NOT NULL DEFAULT 'OWNER',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_resident_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_resident_profiles_flat
        FOREIGN KEY (flat_id)
        REFERENCES flats(id)
        ON DELETE RESTRICT,

    CONSTRAINT ck_resident_profiles_type
        CHECK (resident_type IN ('OWNER', 'TENANT', 'FAMILY_MEMBER')),

    CONSTRAINT ck_resident_profiles_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_resident_profiles_flat_id
    ON resident_profiles(flat_id);

CREATE INDEX idx_resident_profiles_user_id
    ON resident_profiles(user_id);