-- V8__security_staff_status_enum_check.sql
-- Redundant-safe explicit CHECK constraint to enforce the SecurityStaffStatus enum values
-- at the database level, matching the Java enum SecurityStaffStatus { ACTIVE, INACTIVE }.

ALTER TABLE security_staff_profiles
    DROP CONSTRAINT IF EXISTS chk_security_staff_status_enum;

ALTER TABLE security_staff_profiles
    ADD CONSTRAINT chk_security_staff_status_enum
    CHECK (status IN ('ACTIVE', 'INACTIVE'));
