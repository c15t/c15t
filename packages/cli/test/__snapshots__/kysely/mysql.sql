-- Migration generated by C15T (2023-01-01T00:00:00.000Z)
-- Database type: mysql
-- Description: Automatically generated schema migration
-- 
-- Wrapped in a transaction for atomicity
-- To roll back this migration, use the ROLLBACK section below

START TRANSACTION;
-- MIGRATION
CREATE TABLE IF NOT EXISTS "subject" (
  "id" VARCHAR(255) NOT NULL PRIMARY KEY,
  "isIdentified" TINYINT(1) NOT NULL,
  "externalId" text,
  "identityProvider" text,
  "lastIpAddress" text,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "subjectTimezone" text
);

CREATE TABLE IF NOT EXISTS "consentPurpose" (
  "id" VARCHAR(255) NOT NULL PRIMARY KEY,
  "code" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" VARCHAR(255) NOT NULL,
  "isEssential" TINYINT(1) NOT NULL,
  "dataCategory" text,
  "legalBasis" text,
  "isActive" TINYINT(1) NOT NULL,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "domain" (
  "id" VARCHAR(255) NOT NULL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "description" VARCHAR(255),
  "allowedOrigins" text,
  "isVerified" TINYINT(1) NOT NULL,
  "isActive" TINYINT(1) NOT NULL,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME
);

CREATE TABLE IF NOT EXISTS "geoLocation" (
  "id" VARCHAR(255) NOT NULL PRIMARY KEY,
  "countryCode" text NOT NULL,
  "countryName" text NOT NULL,
  "regionCode" text,
  "regionName" text,
  "regulatoryZones" text,
  "createdAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "consentPolicy" (
  "id" VARCHAR(255) NOT NULL PRIMARY KEY,
  "version" text NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "effectiveDate" date NOT NULL,
  "expirationDate" date,
  "content" text NOT NULL,
  "contentHash" text NOT NULL,
  "isActive" TINYINT(1) NOT NULL,
  "createdAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "consent" (
  "id" VARCHAR(255) NOT NULL PRIMARY KEY,
  "subjectId" text NOT NULL REFERENCES "subject" ("id"),
  "domainId" text NOT NULL REFERENCES "domain" ("id"),
  "purposeIds" text,
  "metadata" JSON,
  "policyId" text REFERENCES "consentPolicy" ("id"),
  "ipAddress" text,
  "userAgent" text,
  "status" text NOT NULL,
  "withdrawalReason" text,
  "givenAt" date NOT NULL,
  "validUntil" date,
  "isActive" TINYINT(1) NOT NULL
);

CREATE TABLE IF NOT EXISTS "consentPurposeJunction" (
  "id" VARCHAR(255) NOT NULL PRIMARY KEY,
  "consentId" text NOT NULL REFERENCES "consent" ("id"),
  "purposeId" text NOT NULL REFERENCES "consentPurpose" ("id"),
  "status" text NOT NULL,
  "metadata" JSON,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME
);

CREATE TABLE IF NOT EXISTS "consentRecord" (
  "id" VARCHAR(255) NOT NULL PRIMARY KEY,
  "subjectId" text NOT NULL REFERENCES "subject" ("id"),
  "consentId" text REFERENCES "consent" ("id"),
  "actionType" text NOT NULL,
  "details" text,
  "createdAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "consentGeoLocation" (
  "id" VARCHAR(255) NOT NULL PRIMARY KEY,
  "consentId" text NOT NULL REFERENCES "consent" ("id"),
  "ip" text NOT NULL,
  "country" text,
  "region" text,
  "city" text,
  "latitude" integer,
  "longitude" integer,
  "timezone" text,
  "createdAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "consentWithdrawal" (
  "id" VARCHAR(255) NOT NULL PRIMARY KEY,
  "consentId" text NOT NULL REFERENCES "consent" ("id"),
  "subjectId" text NOT NULL REFERENCES "subject" ("id"),
  "withdrawalReason" text,
  "withdrawalMethod" text NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "metadata" JSON,
  "createdAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "auditLog" (
  "id" VARCHAR(255) NOT NULL PRIMARY KEY,
  "entityType" text NOT NULL,
  "entityId" text NOT NULL,
  "actionType" text NOT NULL,
  "subjectId" text REFERENCES "subject" ("id"),
  "ipAddress" text,
  "userAgent" text,
  "changes" text,
  "metadata" JSON,
  "createdAt" DATETIME NOT NULL,
  "eventTimezone" text NOT NULL
);
COMMIT;

-- ROLLBACK
-- Uncomment the section below to roll back this migration
/*
START TRANSACTION;

DROP TABLE IF EXISTS "auditLog";

DROP TABLE IF EXISTS "consentWithdrawal";

DROP TABLE IF EXISTS "consentGeoLocation";

DROP TABLE IF EXISTS "consentRecord";

DROP TABLE IF EXISTS "consentPurposeJunction";

DROP TABLE IF EXISTS "consent";

DROP TABLE IF EXISTS "consentPolicy";

DROP TABLE IF EXISTS "geoLocation";

DROP TABLE IF EXISTS "domain";

DROP TABLE IF EXISTS "consentPurpose";

DROP TABLE IF EXISTS "subject";

COMMIT;
*/