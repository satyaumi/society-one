-- ==============================================================================
-- V18: Society Creation Requests & Platform Management Hierarchy
-- ==============================================================================

CREATE TABLE society_creation_requests (
    id BIGSERIAL PRIMARY KEY,
    reference_code VARCHAR(40) NOT NULL,
    
    -- Applicant & Contact Information
    applicant_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
    primary_contact_name VARCHAR(120) NOT NULL,
    primary_contact_email VARCHAR(255) NOT NULL,
    primary_contact_phone VARCHAR(30) NOT NULL,
    society_official_email VARCHAR(255),
    
    secondary_contact_name VARCHAR(120),
    secondary_contact_phone VARCHAR(30),
    secondary_contact_email VARCHAR(255),
    
    -- Society Details
    society_name VARCHAR(160) NOT NULL,
    registration_number VARCHAR(80),
    society_type VARCHAR(60) NOT NULL DEFAULT 'HOUSING_SOCIETY',
    total_flats INTEGER NOT NULL DEFAULT 1,
    number_of_wings INTEGER NOT NULL DEFAULT 1,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    management_method VARCHAR(80) DEFAULT 'MANUAL',
    
    -- Optional Document Upload
    document_url VARCHAR(500),
    document_filename VARCHAR(255),
    document_size_bytes BIGINT,
    
    -- Review & Lifecycle State
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    reviewer_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
    review_notes TEXT,
    rejection_reason TEXT,
    reviewed_at TIMESTAMPTZ,
    
    -- Created Society Link after Approval
    created_society_id BIGINT REFERENCES societies (id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_society_creation_requests_ref UNIQUE (reference_code)
);

CREATE INDEX idx_society_requests_status ON society_creation_requests (status);
CREATE INDEX idx_society_requests_applicant_email ON society_creation_requests (LOWER(primary_contact_email));
CREATE INDEX idx_society_requests_applicant_phone ON society_creation_requests (primary_contact_phone);
CREATE INDEX idx_society_requests_society_name ON society_creation_requests (LOWER(society_name));
CREATE INDEX idx_society_requests_created_at ON society_creation_requests (created_at DESC);
