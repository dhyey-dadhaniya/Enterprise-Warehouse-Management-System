# WMS Frontend (React + TypeScript + Vite)

This is the frontend UI for **Enterprise Warehouse Management System (WMS)**.

## What this frontend will do

- Show pages like inventory, orders, and receiving
- Call backend APIs for:
  - login
  - warehouse setup (locations, items)
  - receiving + putaway
  - inventory
  - picking

## Tech stack

- React + TypeScript
- Vite

## How to run (local)

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

## Backend connection

- Backend base URL (planned): `http://localhost:8080`
- Health endpoint: `GET /api/health`

