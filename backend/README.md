# WMS Backend (Spring Boot)

This is the backend service for **Enterprise Warehouse Management System (WMS)**.

## What this backend will do

- User login + roles (Admin, Manager, Receiver, Picker)
- Warehouse setup (warehouse, zones, bins/locations)
- Item/SKU catalog
- Receiving + putaway tasks
- Real-time inventory (by SKU + by location)
- Orders + picking tasks (waves)
- Inventory ledger (history of every stock movement)

## Tech stack

- Java 17
- Spring Boot (Web, Validation, Security, JPA)
- PostgreSQL
- Flyway (DB migrations)
- Swagger/OpenAPI (API docs)

## Project structure

- `src/main/java/com/infotact/wms/`: application code
- `src/main/resources/application.yml`: config
- `src/main/resources/db/migration/`: Flyway migrations
- `DAY1_WMS_DESIGN.md`: Day 1 design (flow, modules, API list, DB table plan)

## How to run (local)

### 1) Create database (PostgreSQL)

Create a DB and user matching `application.yml`:

- DB: `wms`
- User: `wms`
- Password: `wms`

### 2) Run backend

From repo root:

```bash
mvn -f backend/pom.xml spring-boot:run
```

Backend will start on: `http://localhost:8080`

## Useful endpoints

- Health: `GET /api/health`
- Actuator health: `GET /actuator/health`
- Swagger UI: `GET /swagger-ui/index.html`

