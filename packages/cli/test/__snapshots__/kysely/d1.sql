-- Migration generated by C15T (2023-01-01T00:00:00.000Z)
-- Database type: d1
-- Description: Automatically generated schema migration
-- 
-- Wrapped in a transaction for atomicity
-- To roll back this migration, use the ROLLBACK section below


-- MIGRATION
CREATE TABLE IF NOT EXISTS "subject" (
  "id" text NOT NULL PRIMARY KEY,
  "isIdentified" integer NOT NULL,
  "externalId" text,
  "identityProvider" text,
  "lastIpAddress" text,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL,
  "subjectTimezone" text
);

CREATE TABLE IF NOT EXISTS "consentPurpose" (
  "id" text NOT NULL PRIMARY KEY,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "isEssential" integer NOT NULL,
  "dataCategory" text,
  "legalBasis" text,
  "isActive" integer NOT NULL,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL
);

CREATE TABLE IF NOT EXISTS "domain" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "description" text,
  "allowedOrigins" text,
  "isVerified" integer NOT NULL,
  "isActive" integer NOT NULL,
  "createdAt" date NOT NULL,
  "updatedAt" date
);

CREATE TABLE IF NOT EXISTS "geoLocation" (
  "id" text NOT NULL PRIMARY KEY,
  "countryCode" text NOT NULL,
  "countryName" text NOT NULL,
  "regionCode" text,
  "regionName" text,
  "regulatoryZones" text,
  "createdAt" date NOT NULL
);

CREATE TABLE IF NOT EXISTS "consentPolicy" (
  "id" text NOT NULL PRIMARY KEY,
  "version" text NOT NULL,
  "name" text NOT NULL,
  "effectiveDate" date NOT NULL,
  "expirationDate" date,
  "content" text NOT NULL,
  "contentHash" text NOT NULL,
  "isActive" integer NOT NULL,
  "createdAt" date NOT NULL
);

CREATE TABLE IF NOT EXISTS "consent" (
  "id" text NOT NULL PRIMARY KEY,
  "subjectId" text NOT NULL REFERENCES "subject" ("id"),
  "domainId" text NOT NULL REFERENCES "domain" ("id"),
  "purposeIds" text,
  "metadata" text,
  "policyId" text REFERENCES "consentPolicy" ("id"),
  "ipAddress" text,
  "userAgent" text,
  "status" text NOT NULL,
  "withdrawalReason" text,
  "givenAt" date NOT NULL,
  "validUntil" date,
  "isActive" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "consentPurposeJunction" (
  "id" text NOT NULL PRIMARY KEY,
  "consentId" text NOT NULL REFERENCES "consent" ("id"),
  "purposeId" text NOT NULL REFERENCES "consentPurpose" ("id"),
  "status" text NOT NULL,
  "metadata" text,
  "createdAt" date NOT NULL,
  "updatedAt" date
);

CREATE TABLE IF NOT EXISTS "consentRecord" (
  "id" text NOT NULL PRIMARY KEY,
  "subjectId" text NOT NULL REFERENCES "subject" ("id"),
  "consentId" text REFERENCES "consent" ("id"),
  "actionType" text NOT NULL,
  "details" text,
  "createdAt" date NOT NULL
);

CREATE TABLE IF NOT EXISTS "consentGeoLocation" (
  "id" text NOT NULL PRIMARY KEY,
  "consentId" text NOT NULL REFERENCES "consent" ("id"),
  "ip" text NOT NULL,
  "country" text,
  "region" text,
  "city" text,
  "latitude" integer,
  "longitude" integer,
  "timezone" text,
  "createdAt" date NOT NULL
);

CREATE TABLE IF NOT EXISTS "consentWithdrawal" (
  "id" text NOT NULL PRIMARY KEY,
  "consentId" text NOT NULL REFERENCES "consent" ("id"),
  "subjectId" text NOT NULL REFERENCES "subject" ("id"),
  "withdrawalReason" text,
  "withdrawalMethod" text NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "metadata" text,
  "createdAt" date NOT NULL
);

CREATE TABLE IF NOT EXISTS "auditLog" (
  "id" text NOT NULL PRIMARY KEY,
  "entityType" text NOT NULL,
  "entityId" text NOT NULL,
  "actionType" text NOT NULL,
  "subjectId" text REFERENCES "subject" ("id"),
  "ipAddress" text,
  "userAgent" text,
  "changes" text,
  "metadata" text,
  "createdAt" date NOT NULL,
  "eventTimezone" text NOT NULL
);


-- ROLLBACK
-- Uncomment the section below to roll back this migration
/*


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


*/