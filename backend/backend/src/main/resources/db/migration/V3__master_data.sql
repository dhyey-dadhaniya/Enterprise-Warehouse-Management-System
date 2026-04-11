CREATE TABLE warehouses (
    id            BIGSERIAL PRIMARY KEY,
    code          VARCHAR(64)  NOT NULL UNIQUE,
    name          VARCHAR(255) NOT NULL,
    address_line  VARCHAR(512),
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zones (
    id            BIGSERIAL PRIMARY KEY,
    warehouse_id  BIGINT       NOT NULL REFERENCES warehouses (id) ON DELETE CASCADE,
    code          VARCHAR(64)  NOT NULL,
    name          VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (warehouse_id, code)
);

CREATE INDEX idx_zones_warehouse_id ON zones (warehouse_id);

CREATE TABLE bins (
    id            BIGSERIAL PRIMARY KEY,
    zone_id       BIGINT       NOT NULL REFERENCES zones (id) ON DELETE CASCADE,
    code          VARCHAR(64)  NOT NULL,
    description   VARCHAR(512),
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (zone_id, code)
);

CREATE INDEX idx_bins_zone_id ON bins (zone_id);

CREATE TABLE items (
    id            BIGSERIAL PRIMARY KEY,
    sku           VARCHAR(128) NOT NULL UNIQUE,
    name          VARCHAR(255) NOT NULL,
    description   VARCHAR(1024),
    base_uom      VARCHAR(32)  NOT NULL DEFAULT 'EA',
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
