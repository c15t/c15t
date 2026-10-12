-- c15t legal document policy hash migration (manual)
-- Date: 2026-04-10
-- Target: PostgreSQL / Drizzle-managed databases
--
-- This migration adds:
-- 1) public."consentPolicy"."hash" column for legal-document release hashes
--
-- Notes:
-- - Identifiers are quoted to preserve c15t camelCase naming.
-- - Script is idempotent and safe to re-run.
-- - If you use a table prefix/schema, adjust object names accordingly.

BEGIN;

ALTER TABLE public."consentPolicy"
ADD COLUMN IF NOT EXISTS "hash" text NULL;

COMMIT;
