ALTER TABLE putaway_tasks
    ADD COLUMN assigned_user_id BIGINT REFERENCES users (id),
    ADD COLUMN confirmed_to_bin_id BIGINT REFERENCES bins (id);

CREATE INDEX idx_putaway_tasks_assigned_user ON putaway_tasks (assigned_user_id);
