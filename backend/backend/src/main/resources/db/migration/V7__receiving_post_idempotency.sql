CREATE TABLE receiving_post_idempotency (
    idempotency_key            VARCHAR(128)   NOT NULL PRIMARY KEY,
    inbound_document_id        BIGINT         NOT NULL REFERENCES inbound_documents (id),
    inbound_document_line_id   BIGINT         NOT NULL REFERENCES inbound_document_lines (id),
    staging_bin_id             BIGINT         NOT NULL REFERENCES bins (id),
    quantity                   NUMERIC(19, 4) NOT NULL,
    inventory_ledger_id        BIGINT         NOT NULL REFERENCES inventory_ledger (id),
    created_at                 TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_receiving_post_idem_qty CHECK (quantity > 0)
);

CREATE INDEX idx_receiving_post_idem_line ON receiving_post_idempotency (inbound_document_line_id);
