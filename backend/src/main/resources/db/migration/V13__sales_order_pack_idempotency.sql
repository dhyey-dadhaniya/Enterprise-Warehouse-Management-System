CREATE TABLE sales_order_pack_idempotency (
    idempotency_key      VARCHAR(128) PRIMARY KEY,
    sales_order_id       BIGINT      NOT NULL REFERENCES sales_orders (id) ON DELETE CASCADE,
    packed_at            TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_so_pack_idem_order ON sales_order_pack_idempotency (sales_order_id);
