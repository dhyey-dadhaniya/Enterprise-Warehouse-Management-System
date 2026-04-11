CREATE TABLE aisles (
    id         BIGSERIAL PRIMARY KEY,
    zone_id    BIGINT       NOT NULL REFERENCES zones (id) ON DELETE CASCADE,
    code       VARCHAR(64)  NOT NULL,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (zone_id, code)
);

CREATE INDEX idx_aisles_zone_id ON aisles (zone_id);

ALTER TABLE bins
    ADD COLUMN aisle_id BIGINT REFERENCES aisles (id) ON DELETE SET NULL;

CREATE INDEX idx_bins_aisle_id ON bins (aisle_id);
