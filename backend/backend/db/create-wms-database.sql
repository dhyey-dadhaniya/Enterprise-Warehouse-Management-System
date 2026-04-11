-- Run once as a PostgreSQL superuser (usually "postgres"), before starting the app:
--
--   psql -U postgres -h localhost -f backend/db/create-wms-database.sql
--
-- If the database already exists, the last line may error — that is OK.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wms') THEN
    CREATE ROLE wms WITH LOGIN PASSWORD 'wms';
  END IF;
END
$$;

CREATE DATABASE wms OWNER wms;
