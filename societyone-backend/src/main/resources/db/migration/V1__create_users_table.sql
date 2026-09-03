CREATE TABLE users (
                       id BIGSERIAL PRIMARY KEY,

                       full_name VARCHAR(120) NOT NULL,

                       username VARCHAR(50) NOT NULL,
                       email VARCHAR(255),
                       mobile_number VARCHAR(30),

                       password_hash VARCHAR(255) NOT NULL,

                       role VARCHAR(20) NOT NULL,

                       account_status VARCHAR(20) NOT NULL,

                       email_verified BOOLEAN NOT NULL DEFAULT FALSE,

                       mobile_verified BOOLEAN NOT NULL DEFAULT FALSE,

                       created_at TIMESTAMPTZ NOT NULL,

                       updated_at TIMESTAMPTZ NOT NULL,

                       last_login_at TIMESTAMPTZ,

                       CONSTRAINT uk_users_username UNIQUE (username),
                       CONSTRAINT uk_users_email UNIQUE (email),
                       CONSTRAINT uk_users_mobile_number UNIQUE (mobile_number)
);