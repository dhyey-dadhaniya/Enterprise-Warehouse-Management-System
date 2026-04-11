CREATE TABLE sales_orders (
    id              BIGSERIAL PRIMARY KEY,
    warehouse_id    BIGINT         NOT NULL REFERENCES warehouses (id),
    order_number    VARCHAR(64)    NOT NULL UNIQUE,
    status          VARCHAR(32)    NOT NULL,
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_orders_wh ON sales_orders (warehouse_id);
CREATE INDEX idx_sales_orders_status ON sales_orders (status);

CREATE TABLE sales_order_lines (
    id                  BIGSERIAL PRIMARY KEY,
    order_id            BIGINT         NOT NULL REFERENCES sales_orders (id) ON DELETE CASCADE,
    line_number         INT            NOT NULL,
    item_id             BIGINT         NOT NULL REFERENCES items (id),
    quantity_ordered    NUMERIC(19, 4) NOT NULL,
    quantity_allocated  NUMERIC(19, 4) NOT NULL DEFAULT 0,
    quantity_picked     NUMERIC(19, 4) NOT NULL DEFAULT 0,
    UNIQUE (order_id, line_number),
    CONSTRAINT chk_sol_qty_ordered_pos CHECK (quantity_ordered > 0),
    CONSTRAINT chk_sol_alloc_nonneg CHECK (quantity_allocated >= 0),
    CONSTRAINT chk_sol_pick_nonneg CHECK (quantity_picked >= 0)
);

CREATE INDEX idx_sales_order_lines_order ON sales_order_lines (order_id);
CREATE INDEX idx_sales_order_lines_item ON sales_order_lines (item_id);

CREATE TABLE order_line_allocations (
    id                   BIGSERIAL PRIMARY KEY,
    sales_order_line_id  BIGINT         NOT NULL REFERENCES sales_order_lines (id) ON DELETE CASCADE,
    bin_id               BIGINT         NOT NULL REFERENCES bins (id),
    quantity             NUMERIC(19, 4) NOT NULL,
    CONSTRAINT chk_ola_qty_pos CHECK (quantity > 0)
);

CREATE INDEX idx_ola_line ON order_line_allocations (sales_order_line_id);
CREATE INDEX idx_ola_bin ON order_line_allocations (bin_id);

CREATE TABLE pick_waves (
    id             BIGSERIAL PRIMARY KEY,
    warehouse_id   BIGINT         NOT NULL REFERENCES warehouses (id),
    wave_code      VARCHAR(64)    NOT NULL UNIQUE,
    status         VARCHAR(32)    NOT NULL,
    created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pick_waves_wh ON pick_waves (warehouse_id);

CREATE TABLE pick_wave_orders (
    pick_wave_id    BIGINT NOT NULL REFERENCES pick_waves (id) ON DELETE CASCADE,
    sales_order_id  BIGINT NOT NULL REFERENCES sales_orders (id) ON DELETE CASCADE,
    PRIMARY KEY (pick_wave_id, sales_order_id)
);

CREATE TABLE pick_tasks (
    id                    BIGSERIAL PRIMARY KEY,
    pick_wave_id          BIGINT         NOT NULL REFERENCES pick_waves (id) ON DELETE CASCADE,
    sales_order_line_id   BIGINT         NOT NULL REFERENCES sales_order_lines (id),
    warehouse_id          BIGINT         NOT NULL REFERENCES warehouses (id),
    bin_id                BIGINT         NOT NULL REFERENCES bins (id),
    item_id               BIGINT         NOT NULL REFERENCES items (id),
    quantity_to_pick      NUMERIC(19, 4) NOT NULL,
    quantity_picked       NUMERIC(19, 4) NOT NULL DEFAULT 0,
    status                VARCHAR(32)    NOT NULL,
    route_sequence        INT            NOT NULL,
    created_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pt_pick_pos CHECK (quantity_to_pick > 0),
    CONSTRAINT chk_pt_picked_nonneg CHECK (quantity_picked >= 0),
    CONSTRAINT chk_pt_picked_le_to CHECK (quantity_picked <= quantity_to_pick)
);

CREATE INDEX idx_pick_tasks_wave ON pick_tasks (pick_wave_id);
CREATE INDEX idx_pick_tasks_wave_status ON pick_tasks (pick_wave_id, status);
CREATE INDEX idx_pick_tasks_route ON pick_tasks (pick_wave_id, route_sequence);
