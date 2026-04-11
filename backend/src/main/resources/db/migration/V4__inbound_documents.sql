CREATE TABLE inbound_documents (
    id                    BIGSERIAL PRIMARY KEY,
    document_number       VARCHAR(64)  NOT NULL UNIQUE,
    document_type         VARCHAR(16)  NOT NULL,
    warehouse_id          BIGINT       NOT NULL REFERENCES warehouses (id),
    status                VARCHAR(32)  NOT NULL,
    supplier_name         VARCHAR(255),
    reference             VARCHAR(128),
    expected_delivery_date DATE,
    notes                 VARCHAR(2000),
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_inbound_document_type CHECK (document_type IN ('ASN', 'PO'))
);

CREATE INDEX idx_inbound_documents_wh ON inbound_documents (warehouse_id);
CREATE INDEX idx_inbound_documents_status ON inbound_documents (status);

CREATE TABLE inbound_document_lines (
    id                   BIGSERIAL PRIMARY KEY,
    inbound_document_id  BIGINT        NOT NULL REFERENCES inbound_documents (id) ON DELETE CASCADE,
    line_number          INT           NOT NULL,
    item_id              BIGINT        NOT NULL REFERENCES items (id),
    expected_qty         NUMERIC(19, 4) NOT NULL,
    received_qty         NUMERIC(19, 4) NOT NULL DEFAULT 0,
    notes                VARCHAR(1024),
    UNIQUE (inbound_document_id, line_number),
    CONSTRAINT chk_inbound_line_expected_nonneg CHECK (expected_qty >= 0),
    CONSTRAINT chk_inbound_line_received_nonneg CHECK (received_qty >= 0)
);

CREATE INDEX idx_inbound_lines_doc ON inbound_document_lines (inbound_document_id);
CREATE INDEX idx_inbound_lines_item ON inbound_document_lines (item_id);
