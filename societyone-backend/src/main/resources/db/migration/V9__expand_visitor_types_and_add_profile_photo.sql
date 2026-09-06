ALTER TABLE visitors
    DROP CONSTRAINT IF EXISTS ck_visitors_type;

ALTER TABLE visitors
    ADD CONSTRAINT ck_visitors_type
        CHECK (
            visitor_type IN (
                'GUEST',
                'DELIVERY',
                'COURIER',
                'CAB_AUTO',
                'DRIVER',
                'TECHNICIAN',
                'VENDOR_CONTRACTOR',
                'DOMESTIC_WORKER',
                'OTHER'
            )
        );

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500);
