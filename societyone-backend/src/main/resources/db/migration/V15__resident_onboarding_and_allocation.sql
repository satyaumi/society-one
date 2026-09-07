-- V15: Resident Onboarding Requests and Flat Allocation Details

CREATE TABLE resident_onboarding_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    society_id BIGINT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    resident_type VARCHAR(30) NOT NULL DEFAULT 'OWNER',
    flat_type_preference VARCHAR(30),
    family_member_count INT NOT NULL DEFAULT 1,
    preferred_building_id BIGINT,
    preferred_flat_number VARCHAR(30),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(30),
    vehicle_number VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    admin_notes TEXT,
    allocated_flat_id BIGINT,
    allocated_by_user_id BIGINT,
    confirmed_flat_type VARCHAR(30),
    maintenance_info VARCHAR(255),
    parking_status VARCHAR(100),
    allocated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_onboarding_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_onboarding_society
        FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,

    CONSTRAINT fk_onboarding_preferred_building
        FOREIGN KEY (preferred_building_id) REFERENCES buildings(id) ON DELETE SET NULL,

    CONSTRAINT fk_onboarding_allocated_flat
        FOREIGN KEY (allocated_flat_id) REFERENCES flats(id) ON DELETE SET NULL,

    CONSTRAINT fk_onboarding_allocated_by
        FOREIGN KEY (allocated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT uk_onboarding_user_society
        UNIQUE (user_id, society_id),

    CONSTRAINT ck_onboarding_resident_type
        CHECK (resident_type IN ('OWNER', 'TENANT', 'FAMILY_MEMBER')),

    CONSTRAINT ck_onboarding_status
        CHECK (status IN ('ONBOARDING_REQUIRED', 'SUBMITTED', 'UNDER_ADMIN_REVIEW', 'CHANGES_REQUESTED', 'ALLOCATED', 'REJECTED', 'CANCELLED'))
);

CREATE INDEX idx_onboarding_society_status
    ON resident_onboarding_requests(society_id, status);

CREATE INDEX idx_onboarding_user_id
    ON resident_onboarding_requests(user_id);

-- Enhance resident_profiles table with official allocation details
ALTER TABLE resident_profiles
    ADD COLUMN IF NOT EXISTS flat_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS maintenance_info VARCHAR(255),
    ADD COLUMN IF NOT EXISTS parking_slot VARCHAR(100),
    ADD COLUMN IF NOT EXISTS family_member_count INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS allocated_at TIMESTAMPTZ;
