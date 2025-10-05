# Ticket 5.1: Database Schema

## 📋 Ticket Details
**Phase**: 5 - Consent.io Control Plane  
**Story Points**: 3  
**Priority**: High  
**Assignee**: TBD  
**Status**: Ready

## 🔗 Dependencies
**Depends on**: Phase 3 Complete  
**Blocking**: Ticket 5.2 (Admin API Contracts), Ticket 5.4 (Database Loading)  

## 🎯 Description
Create database tables for destination configuration in the consent.io control plane. This enables multi-tenant destination management where each organization can configure their analytics destinations independently with their own API keys and settings.

## 🧠 Context & Background
This ticket creates the foundation for the **consent.io control plane** - a multi-tenant system where:

- **Organizations** have isolated instances with their own destination configurations
- **Destinations** store API keys, settings, and configuration per organization
- **Environments** allow separate configs for dev/staging/production
- **Security** ensures complete data isolation between organizations
- **Audit trails** track all configuration changes
- **Soft deletes** preserve data for compliance and rollback

The control plane enables:
- Self-service destination management
- Organization-specific API key storage
- Environment-based configuration
- Complete data isolation
- Audit compliance

## ✅ Acceptance Criteria
- [ ] Create `destinations` table with all required fields
- [ ] Add indexes for performance
- [ ] Add foreign key to organizations table
- [ ] Add soft delete support
- [ ] Add audit fields (createdBy, updatedAt)
- [ ] Create migration files
- [ ] Add RLS policies for organization isolation

## 📁 Files to Update
- `packages/backend/src/v2/db/schema/` (add destinations schema)

## 🔧 Implementation Details

### Database Schema
```sql
-- Destinations table for consent.io control plane
CREATE TABLE destinations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization isolation
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Destination identification
  type VARCHAR(50) NOT NULL, -- 'posthog', 'meta-pixel', 'google-analytics', etc.
  name VARCHAR(255) NOT NULL, -- User-friendly name
  description TEXT,
  
  -- Environment support
  environment VARCHAR(20) NOT NULL DEFAULT 'production', -- 'development', 'staging', 'production'
  
  -- Configuration
  settings JSONB NOT NULL DEFAULT '{}', -- Encrypted destination settings
  settings_encrypted BOOLEAN NOT NULL DEFAULT true, -- Flag for encryption status
  
  -- Consent requirements
  required_consent TEXT[] NOT NULL DEFAULT '{}', -- ['marketing', 'measurement', etc.]
  
  -- Status and control
  enabled BOOLEAN NOT NULL DEFAULT true,
  test_mode BOOLEAN NOT NULL DEFAULT false,
  
  -- Connection status
  last_tested_at TIMESTAMP WITH TIME ZONE,
  connection_status VARCHAR(20) DEFAULT 'unknown', -- 'connected', 'failed', 'unknown'
  last_error TEXT,
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT destinations_org_type_env_unique UNIQUE (organization_id, type, environment) WHERE deleted_at IS NULL,
  CONSTRAINT destinations_valid_type CHECK (type IN ('posthog', 'meta-pixel', 'google-analytics', 'console', 'mixpanel', 'amplitude')),
  CONSTRAINT destinations_valid_environment CHECK (environment IN ('development', 'staging', 'production')),
  CONSTRAINT destinations_valid_consent CHECK (required_consent <@ ARRAY['necessary', 'measurement', 'marketing', 'functionality', 'experience']),
  CONSTRAINT destinations_valid_status CHECK (connection_status IN ('connected', 'failed', 'unknown', 'testing'))
);

-- Performance indexes
CREATE INDEX idx_destinations_organization_id ON destinations(organization_id);
CREATE INDEX idx_destinations_type ON destinations(type);
CREATE INDEX idx_destinations_environment ON destinations(environment);
CREATE INDEX idx_destinations_enabled ON destinations(enabled);
CREATE INDEX idx_destinations_deleted_at ON destinations(deleted_at);
CREATE INDEX idx_destinations_created_at ON destinations(created_at);
CREATE INDEX idx_destinations_updated_at ON destinations(updated_at);

-- Composite indexes for common queries
CREATE INDEX idx_destinations_org_env ON destinations(organization_id, environment);
CREATE INDEX idx_destinations_org_enabled ON destinations(organization_id, enabled);
CREATE INDEX idx_destinations_type_env ON destinations(type, environment);

-- JSONB indexes for settings queries
CREATE INDEX idx_destinations_settings_gin ON destinations USING GIN (settings);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_destinations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_destinations_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see destinations for their organization
CREATE POLICY destinations_organization_isolation ON destinations
  FOR ALL
  TO authenticated
  USING (organization_id = auth.jwt() ->> 'organization_id'::text);

-- Policy: Service role can access all destinations (for system operations)
CREATE POLICY destinations_service_access ON destinations
  FOR ALL
  TO service_role
  USING (true);

-- Policy: Anonymous users cannot access destinations
CREATE POLICY destinations_no_anonymous ON destinations
  FOR ALL
  TO anon
  USING (false);
```

### TypeScript Schema Definition
```typescript
// Database schema types
export interface Destination {
  id: string;
  organizationId: string;
  type: DestinationType;
  name: string;
  description?: string;
  environment: Environment;
  settings: Record<string, unknown>;
  settingsEncrypted: boolean;
  requiredConsent: ConsentPurpose[];
  enabled: boolean;
  testMode: boolean;
  lastTestedAt?: Date;
  connectionStatus: ConnectionStatus;
  lastError?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export type DestinationType = 
  | 'posthog' 
  | 'meta-pixel' 
  | 'google-analytics' 
  | 'console' 
  | 'mixpanel' 
  | 'amplitude';

export type Environment = 'development' | 'staging' | 'production';

export type ConnectionStatus = 'connected' | 'failed' | 'unknown' | 'testing';

// Settings schemas for each destination type
export interface PostHogSettings {
  apiKey: string;
  host?: string;
  enableServerSide: boolean;
  enableClientSide: boolean;
}

export interface MetaPixelSettings {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  apiVersion?: string;
  enableServerSide: boolean;
  enableClientSide: boolean;
}

export interface GoogleAnalyticsSettings {
  measurementId: string;
  apiSecret: string;
  enableServerSide: boolean;
  enableClientSide: boolean;
  enableEnhancedMeasurement: boolean;
  anonymizeIp: boolean;
}

// Database operations
export interface DestinationRepository {
  create(destination: CreateDestinationInput): Promise<Destination>;
  findById(id: string): Promise<Destination | null>;
  findByOrganization(organizationId: string, environment?: Environment): Promise<Destination[]>;
  findByType(type: DestinationType, environment?: Environment): Promise<Destination[]>;
  update(id: string, updates: Partial<Destination>): Promise<Destination>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  testConnection(id: string): Promise<boolean>;
}

export interface CreateDestinationInput {
  organizationId: string;
  type: DestinationType;
  name: string;
  description?: string;
  environment: Environment;
  settings: Record<string, unknown>;
  requiredConsent: ConsentPurpose[];
  enabled?: boolean;
  testMode?: boolean;
  createdBy?: string;
}
```

### Migration File
```sql
-- Migration: Create destinations table
-- File: packages/backend/src/v2/db/migrations/001_create_destinations.sql

BEGIN;

-- Create destinations table
CREATE TABLE destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  environment VARCHAR(20) NOT NULL DEFAULT 'production',
  settings JSONB NOT NULL DEFAULT '{}',
  settings_encrypted BOOLEAN NOT NULL DEFAULT true,
  required_consent TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  test_mode BOOLEAN NOT NULL DEFAULT false,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  connection_status VARCHAR(20) DEFAULT 'unknown',
  last_error TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  CONSTRAINT destinations_org_type_env_unique UNIQUE (organization_id, type, environment) WHERE deleted_at IS NULL,
  CONSTRAINT destinations_valid_type CHECK (type IN ('posthog', 'meta-pixel', 'google-analytics', 'console', 'mixpanel', 'amplitude')),
  CONSTRAINT destinations_valid_environment CHECK (environment IN ('development', 'staging', 'production')),
  CONSTRAINT destinations_valid_consent CHECK (required_consent <@ ARRAY['necessary', 'measurement', 'marketing', 'functionality', 'experience']),
  CONSTRAINT destinations_valid_status CHECK (connection_status IN ('connected', 'failed', 'unknown', 'testing'))
);

-- Create indexes
CREATE INDEX idx_destinations_organization_id ON destinations(organization_id);
CREATE INDEX idx_destinations_type ON destinations(type);
CREATE INDEX idx_destinations_environment ON destinations(environment);
CREATE INDEX idx_destinations_enabled ON destinations(enabled);
CREATE INDEX idx_destinations_deleted_at ON destinations(deleted_at);
CREATE INDEX idx_destinations_created_at ON destinations(created_at);
CREATE INDEX idx_destinations_updated_at ON destinations(updated_at);
CREATE INDEX idx_destinations_org_env ON destinations(organization_id, environment);
CREATE INDEX idx_destinations_org_enabled ON destinations(organization_id, enabled);
CREATE INDEX idx_destinations_type_env ON destinations(type, environment);
CREATE INDEX idx_destinations_settings_gin ON destinations USING GIN (settings);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_destinations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_destinations_updated_at();

-- Enable RLS
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY destinations_organization_isolation ON destinations
  FOR ALL
  TO authenticated
  USING (organization_id = auth.jwt() ->> 'organization_id'::text);

CREATE POLICY destinations_service_access ON destinations
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY destinations_no_anonymous ON destinations
  FOR ALL
  TO anon
  USING (false);

COMMIT;
```

### Settings Encryption
```typescript
// Settings encryption for sensitive data
import { createCipher, createDecipher } from 'crypto';

export class SettingsEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(encryptionKey: string) {
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  encrypt(settings: Record<string, unknown>): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('destinations-settings'));
    
    let encrypted = cipher.update(JSON.stringify(settings), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  decrypt(encryptedData: { encrypted: string; iv: string; tag: string }): Record<string, unknown> {
    const decipher = createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('destinations-settings'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
```

## 🧪 Testing Requirements
- Database schema tests
- Migration tests
- RLS policy tests
- Performance tests for indexes
- Settings encryption tests
- Organization isolation tests
- Soft delete tests
- Audit trail tests

## 🔍 Definition of Done
- [ ] Destinations table created with all required fields
- [ ] Performance indexes added
- [ ] Foreign key relationship to organizations
- [ ] Soft delete functionality implemented
- [ ] Audit fields added
- [ ] Migration files created
- [ ] RLS policies for organization isolation
- [ ] Settings encryption implemented
- [ ] Code review completed

## 📚 Related Documentation
- [Cloud Configuration](../docs/analytics-cloud-configuration.md)
- [Analytics Architecture Diagram](../docs/analytics-architecture-diagram.md)

## 🔗 Dependencies
- Phase 2 Complete ✅

## 🚀 Next Ticket
[3.2: Create Admin API Contracts](./13-admin-api-contracts.md)
