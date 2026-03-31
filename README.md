# Enterprise Warehouse Management System (WMS)

## Project 1 requirement (simple points)

- **Goal**: Make a backend system for a warehouse.
- **Problem it solves**: In many warehouses people use Excel/manual work. This creates wrong stock numbers, lost items, slow picking, and late deliveries.
- **Main idea**: The system should always know **what item (SKU)** is in **which location/bin**, and should help warehouse staff to **receive**, **putaway**, and **pick** items fast.

### What the backend must do

- **Login and roles**
  - Users can login.
  - Roles like: Admin, Manager, Receiver, Picker.
  - Only allowed roles can use specific APIs.

- **Warehouse setup (master data)**
  - Create/manage: Warehouse, Zone, Bin/Location.
  - Create/manage: Item / SKU.

- **Receiving (inbound)**
  - Create inbound document (like ASN/PO).
  - Receive items and record quantity.
  - Handle mismatch (received qty different than expected).

- **Putaway**
  - After receiving, system suggests where to store items (best bin).
  - Create putaway tasks for warehouse operator.
  - Confirm putaway and move stock from receiving area to final bin.

- **Inventory (real-time)**
  - Show stock by SKU and by location.
  - Support stock adjustment (cycle count).
  - Support transfer between bins.
  - Track available stock and reserved stock (for orders).

- **Orders and picking (outbound)**
  - Create sales orders with order lines.
  - Reserve/allocate stock for orders.
  - Create picking tasks (pick list / wave).
  - Confirm picking and update order status.

- **Audit / history**
  - Every stock movement must be saved in a history table (inventory ledger).
  - Store who did it and when.

- **Quality (important for evaluation)**
  - Clean REST APIs (request validation + good error messages).
  - Database tables should be normalized.
  - Swagger/OpenAPI documentation.
  - Tests for important flows.
  - CI build (run tests on commits).
  - GitHub commits must be regular for all 4 weeks.

## 4-week day planning (5 days per week)

### Week 1 (foundation + master data)
| Day | Work plan |
|---|---|
| Day 1 | Understand full WMS flow (receive → putaway → inventory → pick). Decide modules, API list, DB tables. Setup git workflow. |
| Day 2 | Create Spring Boot backend project. Add PostgreSQL config + Flyway migrations. Add basic health endpoint and global error handling. |
| Day 3 | Build Auth (JWT login) + Roles/Permissions. Seed admin user. Add Swagger/OpenAPI. |
| Day 4 | Create master APIs: Warehouse, Zone, Bin/Location, Item/SKU (CRUD). Add validations and migrations. |
| Day 5 | Add pagination/filtering patterns. Add basic tests. Add CI pipeline (build + tests). |

### Week 2 (inbound: receiving + putaway)
| Day | Work plan |
|---|---|
| Day 1 | Create Receiving APIs (ASN/PO, receiving lines, statuses). |
| Day 2 | Posting receiving: increase inventory in receiving/staging location. Write inventory ledger entries. |
| Day 3 | Putaway suggestion logic v1 (simple rules). Create putaway tasks. |
| Day 4 | Putaway execution: assign/claim task, confirm putaway, move stock to final bin. Ledger entries + transactions. |
| Day 5 | Integration tests for inbound flow. Role checks (Receiver vs Manager). |

### Week 3 (inventory controls + outbound picking)
| Day | Work plan |
|---|---|
| Day 1 | Inventory APIs: on-hand/reserved/available. Search by SKU/location. Low stock endpoint. |
| Day 2 | Inventory operations: adjustment (cycle count), transfers, damage/quarantine (optional). Ledger updates. |
| Day 3 | Sales Order APIs: create order, lines, statuses. Reservation/allocation logic v1. |
| Day 4 | Picking wave: create wave, generate pick tasks. Simple route order (zone/bin sorting). |
| Day 5 | Pick execution: confirm pick, update inventory and order status. End-to-end tests for outbound flow. |

### Week 4 (hardening + reporting + release)
| Day | Work plan |
|---|---|
| Day 1 | Security hardening: audit log, correlation IDs, improve token handling. |
| Day 2 | Correctness/performance: indexes, optimistic locking, idempotency for confirm actions. |
| Day 3 | Reporting APIs: inventory ledger search, inbound/outbound daily totals, picker productivity. |
| Day 4 | Final testing + docs: Postman collection, README run steps, sample data. |
| Day 5 | Release prep: docker build, environment configs, demo script, final cleanup. |

