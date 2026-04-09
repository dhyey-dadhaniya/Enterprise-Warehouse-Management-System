-- Optimistic locking columns
ALTER TABLE inventory_balances ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE putaway_tasks ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE pick_tasks ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE inbound_document_lines ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

-- Idempotency tables for confirm/operations
CREATE TABLE putaway_confirm_idempotency (
    idempotency_key         VARCHAR(128) PRIMARY KEY,
    putaway_task_id         BIGINT NOT NULL REFERENCES putaway_tasks (id) ON DELETE CASCADE,
    confirmed_to_bin_id     BIGINT NOT NULL REFERENCES bins (id),
    inventory_ledger_out_id BIGINT NOT NULL REFERENCES inventory_ledger (id),
    inventory_ledger_in_id  BIGINT NOT NULL REFERENCES inventory_ledger (id),
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_putaway_confirm_idem_task ON putaway_confirm_idempotency (putaway_task_id);

CREATE TABLE pick_confirm_idempotency (
    idempotency_key      VARCHAR(128) PRIMARY KEY,
    pick_task_id         BIGINT NOT NULL REFERENCES pick_tasks (id) ON DELETE CASCADE,
    inventory_ledger_id  BIGINT NOT NULL REFERENCES inventory_ledger (id),
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pick_confirm_idem_task ON pick_confirm_idempotency (pick_task_id);

CREATE TABLE inventory_op_idempotency (
    idempotency_key     VARCHAR(128) PRIMARY KEY,
    op_type             VARCHAR(32)  NOT NULL,
    inventory_ledger_id BIGINT       NOT NULL REFERENCES inventory_ledger (id),
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_op_idem_type ON inventory_op_idempotency (op_type);

-- Reporting indexes
CREATE INDEX idx_inventory_ledger_reason ON inventory_ledger (reason);
CREATE INDEX idx_inventory_ledger_ref_type ON inventory_ledger (ref_type);
CREATE INDEX idx_inventory_ledger_ref_doc_no ON inventory_ledger (ref_document_number);
CREATE INDEX idx_inventory_ledger_wh_occurred ON inventory_ledger (warehouse_id, occurred_at);

