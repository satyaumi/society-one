CREATE TABLE visitors (
                          id BIGSERIAL PRIMARY KEY,
                          full_name VARCHAR(150) NOT NULL,
                          mobile_number VARCHAR(30) NOT NULL,
                          visitor_type VARCHAR(30) NOT NULL,
                          vehicle_number VARCHAR(30),
                          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT ck_visitors_type
                              CHECK (
                                  visitor_type IN (
                                                   'GUEST',
                                                   'DELIVERY',
                                                   'TECHNICIAN',
                                                   'DOMESTIC_WORKER',
                                                   'DRIVER'
                                      )
                                  )
);

CREATE INDEX idx_visitors_mobile_number
    ON visitors(mobile_number);


CREATE TABLE visit_requests (
                                id BIGSERIAL PRIMARY KEY,

                                visitor_id BIGINT NOT NULL,
                                society_id BIGINT NOT NULL,
                                flat_id BIGINT NOT NULL,
                                resident_id BIGINT NOT NULL,

                                source VARCHAR(30) NOT NULL,

                                request_status VARCHAR(40) NOT NULL,
                                visit_status VARCHAR(30) NOT NULL,

                                expected_date DATE NOT NULL,
                                expected_time TIME,
                                purpose VARCHAR(500),

                                vehicle_number VARCHAR(30),

                                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                CONSTRAINT fk_visit_requests_visitor
                                    FOREIGN KEY (visitor_id)
                                        REFERENCES visitors(id)
                                        ON DELETE RESTRICT,

                                CONSTRAINT fk_visit_requests_society
                                    FOREIGN KEY (society_id)
                                        REFERENCES societies(id)
                                        ON DELETE RESTRICT,

                                CONSTRAINT fk_visit_requests_flat
                                    FOREIGN KEY (flat_id)
                                        REFERENCES flats(id)
                                        ON DELETE RESTRICT,

                                CONSTRAINT fk_visit_requests_resident
                                    FOREIGN KEY (resident_id)
                                        REFERENCES users(id)
                                        ON DELETE RESTRICT,

                                CONSTRAINT ck_visit_requests_source
                                    CHECK (
                                        source IN (
                                                   'VISITOR',
                                                   'RESIDENT',
                                                   'SECURITY'
                                            )
                                        ),

                                CONSTRAINT ck_visit_requests_status
                                    CHECK (
                                        request_status IN (
                                                           'PENDING_RESIDENT',
                                                           'APPROVED_BY_RESIDENT',
                                                           'REJECTED_BY_RESIDENT',
                                                           'PENDING_SECURITY',
                                                           'ACCEPTED_BY_SECURITY',
                                                           'REJECTED_BY_SECURITY'
                                            )
                                        ),

                                CONSTRAINT ck_visit_requests_visit_status
                                    CHECK (
                                        visit_status IN (
                                                         'EXPECTED',
                                                         'WAITING_AT_GATE',
                                                         'CHECKED_IN',
                                                         'CHECKED_OUT',
                                                         'CANCELLED'
                                            )
                                        )
);

CREATE INDEX idx_visit_requests_visitor_id
    ON visit_requests(visitor_id);

CREATE INDEX idx_visit_requests_society_id
    ON visit_requests(society_id);

CREATE INDEX idx_visit_requests_flat_id
    ON visit_requests(flat_id);

CREATE INDEX idx_visit_requests_resident_id
    ON visit_requests(resident_id);

CREATE INDEX idx_visit_requests_request_status
    ON visit_requests(request_status);

CREATE INDEX idx_visit_requests_visit_status
    ON visit_requests(visit_status);

CREATE INDEX idx_visit_requests_expected_date
    ON visit_requests(expected_date);