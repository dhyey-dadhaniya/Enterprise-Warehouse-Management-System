ALTER TABLE inbound_document_lines
    ADD COLUMN posted_qty NUMERIC(19, 4) NOT NULL DEFAULT 0;

ALTER TABLE inbound_document_lines
    ADD CONSTRAINT chk_inbound_line_posted_nonneg CHECK (posted_qty >= 0);

CREATE TABLE inventory_balances (
    id           BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT        NOT NULL REFERENCES warehouses (id),
    bin_id       BIGINT        NOT NULL REFERENCES bins (id),
    item_id      BIGINT        NOT NULL REFERENCES items (id),
    on_hand_qty  NUMERIC(19,4) NOT NULL DEFAULT 0,
    reserved_qty NUMERIC(19,4) NOT NULL DEFAULT 0,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (warehouse_id, bin_id, item_id),
    CONSTRAINT chk_inventory_on_hand_nonneg CHECK (on_hand_qty >= 0),
    CONSTRAINT chk_inventory_reserved_nonneg CHECK (reserved_qty >= 0)
);

CREATE INDEX idx_inventory_balances_wh_item ON inventory_balances (warehouse_id, item_id);
CREATE INDEX idx_inventory_balances_bin_item ON inventory_balances (bin_id, item_id);

CREATE TABLE inventory_ledger (
    id                   BIGSERIAL PRIMARY KEY,
    occurred_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    warehouse_id         BIGINT        NOT NULL REFERENCES warehouses (id),
    bin_id               BIGINT        NOT NULL REFERENCES bins (id),
    item_id              BIGINT        NOT NULL REFERENCES items (id),
    qty_delta            NUMERIC(19,4) NOT NULL,
    reason               VARCHAR(64)   NOT NULL,
    ref_type             VARCHAR(64),
    ref_document_id      BIGINT,
    ref_document_number  VARCHAR(64),
    ref_line_id          BIGINT,
    note                 VARCHAR(512)
);

CREATE INDEX idx_inventory_ledger_occurred_at ON inventory_ledger (occurred_at);
CREATE INDEX idx_inventory_ledger_wh_item ON inventory_ledger (warehouse_id, item_id);
