CREATE TABLE societies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    contact_phone VARCHAR(30),
    contact_email VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    owner_user_id BIGINT NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_societies_owner UNIQUE (owner_user_id)
);

CREATE UNIQUE INDEX uk_societies_name_ci ON societies (LOWER(name));
CREATE INDEX idx_societies_owner_user_id ON societies (owner_user_id);

CREATE TABLE buildings (
    id BIGSERIAL PRIMARY KEY,
    society_id BIGINT NOT NULL REFERENCES societies (id),
    name VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uk_buildings_society_name_ci ON buildings (society_id, LOWER(name));
CREATE INDEX idx_buildings_society_id ON buildings (society_id);

CREATE TABLE floors (
    id BIGSERIAL PRIMARY KEY,
    building_id BIGINT NOT NULL REFERENCES buildings (id),
    number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_floors_building_number UNIQUE (building_id, number),
    CONSTRAINT chk_floors_number CHECK (number >= 0 AND number <= 200)
);

CREATE INDEX idx_floors_building_id ON floors (building_id);

CREATE TABLE flats (
    id BIGSERIAL PRIMARY KEY,
    society_id BIGINT NOT NULL REFERENCES societies (id),
    building_id BIGINT NOT NULL REFERENCES buildings (id),
    floor_id BIGINT NOT NULL REFERENCES floors (id),
    number VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uk_flats_floor_number_ci ON flats (floor_id, LOWER(number));
CREATE UNIQUE INDEX uk_flats_building_number_ci ON flats (building_id, LOWER(number));
CREATE INDEX idx_flats_society_id ON flats (society_id);
CREATE INDEX idx_flats_building_id ON flats (building_id);
CREATE INDEX idx_flats_floor_id ON flats (floor_id);
