-- Runs once on first cluster init (docker-entrypoint-initdb.d) as POSTGRES_USER.
-- The E2E suite resets this database on every boot, so it must be separate from
-- the dev database (POSTGRES_DB) to keep dev data safe.
CREATE DATABASE mercury_e2e;
