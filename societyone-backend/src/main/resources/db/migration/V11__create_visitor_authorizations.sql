-- V11: Create visitor_authorizations table for multi-resident recurring visitors
CREATE TABLE visitor_authorizations (
    id BIGSERIAL PRIMARY KEY,
    visitor_id BIGINT NOT NULL,
    society_id BIGINT NOT NULL,
    flat_id BIGINT NOT NULL,
    resident_id BIGINT NOT NULL,
    authorization_type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE,
    notes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_va_visitor
        FOREIGN KEY (visitor_id)
        REFERENCES visitors(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_va_society
        FOREIGN KEY (society_id)
        REFERENCES societies(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_va_flat
        FOREIGN KEY (flat_id)
        REFERENCES flats(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_va_resident
        FOREIGN KEY (resident_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT ck_va_auth_type
        CHECK (
            authorization_type IN (
                'PERMANENT',
                'TEMPORARY_TODAY',
                'CUSTOM_EXPIRY'
            )
        ),

    CONSTRAINT ck_va_status
        CHECK (
            status IN (
                'ACTIVE',
                'DISABLED',
                'EXPIRED',
                'REVOKED'
            )
        ),

    CONSTRAINT uq_va_visitor_flat
        UNIQUE (visitor_id, flat_id)
);

CREATE INDEX idx_va_visitor_id ON visitor_authorizations(visitor_id);
CREATE INDEX idx_va_society_id ON visitor_authorizations(society_id);
CREATE INDEX idx_va_flat_id ON visitor_authorizations(flat_id);
CREATE INDEX idx_va_resident_id ON visitor_authorizations(resident_id);
CREATE INDEX idx_va_status ON visitor_authorizations(status);
