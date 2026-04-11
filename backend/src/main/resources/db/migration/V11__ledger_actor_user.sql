ALTER TABLE inventory_ledger
    ADD COLUMN actor_user_id BIGINT REFERENCES users (id);

CREATE INDEX idx_inventory_ledger_actor_user ON inventory_ledger (actor_user_id);

