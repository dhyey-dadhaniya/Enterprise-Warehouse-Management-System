CREATE TABLE putaway_tasks (
    id                       BIGSERIAL PRIMARY KEY,
    warehouse_id             BIGINT         NOT NULL REFERENCES warehouses (id),
    status                   VARCHAR(32)    NOT NULL,
    from_bin_id              BIGINT         NOT NULL REFERENCES bins (id),
    suggested_to_bin_id      BIGINT         NOT NULL REFERENCES bins (id),
    item_id                  BIGINT         NOT NULL REFERENCES items (id),
    quantity                 NUMERIC(19, 4) NOT NULL,
    suggestion_rule          VARCHAR(32),
    inbound_document_line_id BIGINT       REFERENCES inbound_document_lines (id),
    created_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_putaway_qty_positive CHECK (quantity > 0)
);

CREATE INDEX idx_putaway_tasks_wh_status ON putaway_tasks (warehouse_id, status);
CREATE INDEX idx_putaway_tasks_from_bin ON putaway_tasks (from_bin_id);
CREATE INDEX idx_putaway_tasks_line ON putaway_tasks (inbound_document_line_id);
