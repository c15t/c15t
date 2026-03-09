-- c15t runtime policies migration (manual)
-- Date: 2026-03-02
-- Target: PostgreSQL
--
-- This migration adds:
-- 1) public."runtimePolicyDecision" table
-- 2) public."consent"."runtimePolicyDecisionId" and "runtimePolicySource" columns
-- 3) FK + supporting indexes
--
-- Notes:
-- - Identifiers are quoted to preserve c15t camelCase naming.
-- - Script is idempotent and safe to re-run.
-- - If you use a table prefix/schema, adjust object names accordingly.

BEGIN;

CREATE TABLE IF NOT EXISTS public."runtimePolicyDecision" (
	"id" varchar(255) PRIMARY KEY,
	"tenantId" text NULL,
	"policyId" text NOT NULL,
	"fingerprint" text NOT NULL,
	"matchedBy" text NOT NULL,
	"countryCode" text NULL,
	"regionCode" text NULL,
	"jurisdiction" text NOT NULL,
	"language" text NULL,
	"model" text NOT NULL,
	"uiMode" text NULL,
	"bannerUi" json NULL,
	"dialogUi" json NULL,
	"categories" json NULL,
	"proofConfig" json NULL,
	"dedupeKey" text NOT NULL,
	"createdAt" timestamp without time zone NOT NULL DEFAULT now()
);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'runtimePolicyDecision_dedupeKey_key'
			AND conrelid = 'public."runtimePolicyDecision"'::regclass
	) THEN
		ALTER TABLE public."runtimePolicyDecision"
		ADD CONSTRAINT "runtimePolicyDecision_dedupeKey_key"
		UNIQUE ("dedupeKey");
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS "runtimePolicyDecision_fingerprint_idx"
ON public."runtimePolicyDecision" ("fingerprint");

CREATE INDEX IF NOT EXISTS "runtimePolicyDecision_matchedBy_idx"
ON public."runtimePolicyDecision" ("matchedBy");

ALTER TABLE public."runtimePolicyDecision"
ADD COLUMN IF NOT EXISTS "bannerUi" json NULL;

ALTER TABLE public."runtimePolicyDecision"
ADD COLUMN IF NOT EXISTS "dialogUi" json NULL;

ALTER TABLE public."consent"
ADD COLUMN IF NOT EXISTS "runtimePolicyDecisionId" text NULL;

ALTER TABLE public."consent"
ADD COLUMN IF NOT EXISTS "runtimePolicySource" text NULL;

CREATE INDEX IF NOT EXISTS "consent_runtimePolicyDecisionId_idx"
ON public."consent" ("runtimePolicyDecisionId");

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'consent_runtimePolicyDecisionId_fkey'
			AND conrelid = 'public."consent"'::regclass
	) THEN
		ALTER TABLE public."consent"
		ADD CONSTRAINT "consent_runtimePolicyDecisionId_fkey"
		FOREIGN KEY ("runtimePolicyDecisionId")
		REFERENCES public."runtimePolicyDecision" ("id")
		ON DELETE SET NULL
		ON UPDATE NO ACTION;
	END IF;
END $$;

COMMIT;
