# Ticket 5.2: Consent Backend API Contracts

## 📋 Ticket Details
**Phase**: 5 - Consent.io Control Plane  
**Story Points**: 2  
**Priority**: High  
**Assignee**: TBD  
**Status**: Ready

## 🔗 Dependencies
**Depends on**: Ticket 5.1 (Database Schema)  
**Blocking**: Ticket 5.3 (Consent Backend API Handlers)  

## 🎯 Description
Define API contracts for destination management in the consent.io control plane dashboard. This enables organizations to manage their analytics destinations through a web interface, while self-hosted users continue using direct code configuration.

## 🧠 Context & Background
This ticket creates the API contracts for the **consent.io control plane** dashboard where:

- **Organizations** manage destinations through a web UI instead of code
- **API contracts** define the interface between dashboard and backend
- **Self-hosted users** continue using `c15tInstance` with direct configuration
- **Two deployment models** coexist:
  - **Consent.io SaaS**: Dashboard → Database → Deployed Instance
  - **Self-hosted**: Code → c15tInstance → Analytics

The API contracts must:
- Support CRUD operations for destinations
- Validate settings per destination type
- Handle encryption/decryption of sensitive data
- Provide proper error responses
- Support environment-based configuration

## ✅ Acceptance Criteria
- [ ] Create contracts for CRUD operations
- [ ] Add validation schemas
- [ ] Add response types
- [ ] Add error handling
- [ ] Add comprehensive JSDoc
- [ ] Unit tests for contracts

## 📁 Files to Update
- `packages/backend/src/v2/contracts/` (add admin contracts)

## 🔧 Implementation Details

### API Contract Definitions
```typescript
import { z } from 'zod';
import { DestinationType, Environment, ConsentPurpose } from '../../analytics/types';

// Base destination contract
export const BaseDestinationContract = z.object({
  type: z.enum(['posthog', 'meta-pixel', 'google-analytics', 'console', 'mixpanel', 'amplitude']),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production']).default('production'),
  requiredConsent: z.array(z.enum(['necessary', 'measurement', 'marketing', 'functionality', 'experience'])),
  enabled: z.boolean().default(true),
  testMode: z.boolean().default(false),
});

// Destination-specific settings contracts
export const PostHogSettingsContract = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  host: z.string().url().optional(),
  enableServerSide: z.boolean().default(true),
  enableClientSide: z.boolean().default(true),
});

export const MetaPixelSettingsContract = z.object({
  pixelId: z.string().min(1, 'Pixel ID is required'),
  accessToken: z.string().min(1, 'Access token is required'),
  testEventCode: z.string().optional(),
  apiVersion: z.string().default('v18.0'),
  enableServerSide: z.boolean().default(true),
  enableClientSide: z.boolean().default(true),
});

export const GoogleAnalyticsSettingsContract = z.object({
  measurementId: z.string().min(1, 'Measurement ID is required'),
  apiSecret: z.string().min(1, 'API secret is required'),
  enableServerSide: z.boolean().default(true),
  enableClientSide: z.boolean().default(true),
  enableEnhancedMeasurement: z.boolean().default(true),
  anonymizeIp: z.boolean().default(true),
});

// Union of all settings contracts
export const DestinationSettingsContract = z.discriminatedUnion('type', [
  z.object({ type: z.literal('posthog'), settings: PostHogSettingsContract }),
  z.object({ type: z.literal('meta-pixel'), settings: MetaPixelSettingsContract }),
  z.object({ type: z.literal('google-analytics'), settings: GoogleAnalyticsSettingsContract }),
  z.object({ type: z.literal('console'), settings: z.object({ logLevel: z.string().default('info') }) }),
  z.object({ type: z.literal('mixpanel'), settings: z.object({ token: z.string(), apiSecret: z.string() }) }),
  z.object({ type: z.literal('amplitude'), settings: z.object({ apiKey: z.string(), apiSecret: z.string() }) }),
]);

// Complete destination contract
export const CreateDestinationContract = BaseDestinationContract.merge(DestinationSettingsContract);

export const UpdateDestinationContract = BaseDestinationContract.partial().merge(
  z.object({ settings: z.record(z.unknown()).optional() })
);

// Response contracts
export const DestinationResponseContract = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  type: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  environment: z.string(),
  settings: z.record(z.unknown()),
  settingsEncrypted: z.boolean(),
  requiredConsent: z.array(z.string()),
  enabled: z.boolean(),
  testMode: z.boolean(),
  lastTestedAt: z.string().datetime().nullable(),
  connectionStatus: z.enum(['connected', 'failed', 'unknown', 'testing']),
  lastError: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export const DestinationListResponseContract = z.object({
  destinations: z.array(DestinationResponseContract),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// Error contracts
export const ValidationErrorContract = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
});

export const ApiErrorContract = z.object({
  error: z.string(),
  message: z.string(),
  details: z.array(ValidationErrorContract).optional(),
  statusCode: z.number(),
});

// Test connection contract
export const TestConnectionContract = z.object({
  destinationId: z.string().uuid(),
});

export const TestConnectionResponseContract = z.object({
  success: z.boolean(),
  message: z.string(),
  testedAt: z.string().datetime(),
  connectionStatus: z.enum(['connected', 'failed', 'unknown']),
  error: z.string().optional(),
});
```

### Request/Response Types
```typescript
// TypeScript types derived from contracts
export type CreateDestinationRequest = z.infer<typeof CreateDestinationContract>;
export type UpdateDestinationRequest = z.infer<typeof UpdateDestinationContract>;
export type DestinationResponse = z.infer<typeof DestinationResponseContract>;
export type DestinationListResponse = z.infer<typeof DestinationListResponseContract>;
export type ApiError = z.infer<typeof ApiErrorContract>;
export type TestConnectionRequest = z.infer<typeof TestConnectionContract>;
export type TestConnectionResponse = z.infer<typeof TestConnectionResponseContract>;

// Settings types
export type PostHogSettings = z.infer<typeof PostHogSettingsContract>;
export type MetaPixelSettings = z.infer<typeof MetaPixelSettingsContract>;
export type GoogleAnalyticsSettings = z.infer<typeof GoogleAnalyticsSettingsContract>;
```

### API Endpoint Contracts
```typescript
// REST API endpoint definitions
export interface DestinationApiEndpoints {
  // CRUD operations
  'POST /api/v1/destinations': {
    body: CreateDestinationRequest;
    response: DestinationResponse;
    errors: ApiError;
  };
  
  'GET /api/v1/destinations': {
    query: {
      page?: number;
      limit?: number;
      environment?: Environment;
      type?: DestinationType;
      enabled?: boolean;
    };
    response: DestinationListResponse;
    errors: ApiError;
  };
  
  'GET /api/v1/destinations/:id': {
    params: { id: string };
    response: DestinationResponse;
    errors: ApiError;
  };
  
  'PUT /api/v1/destinations/:id': {
    params: { id: string };
    body: UpdateDestinationRequest;
    response: DestinationResponse;
    errors: ApiError;
  };
  
  'DELETE /api/v1/destinations/:id': {
    params: { id: string };
    response: { success: boolean; message: string };
    errors: ApiError;
  };
  
  // Test connection
  'POST /api/v1/destinations/:id/test': {
    params: { id: string };
    response: TestConnectionResponse;
    errors: ApiError;
  };
  
  // Bulk operations
  'POST /api/v1/destinations/bulk': {
    body: {
      action: 'enable' | 'disable' | 'delete';
      destinationIds: string[];
    };
    response: { 
      success: boolean; 
      processed: number; 
      failed: number;
      errors: Array<{ id: string; error: string }>;
    };
    errors: ApiError;
  };
}
```

### Validation Helpers
```typescript
// Validation helper functions
export class DestinationValidator {
  static validateCreateDestination(data: unknown): CreateDestinationRequest {
    return CreateDestinationContract.parse(data);
  }
  
  static validateUpdateDestination(data: unknown): UpdateDestinationRequest {
    return UpdateDestinationContract.parse(data);
  }
  
  static validateTestConnection(data: unknown): TestConnectionRequest {
    return TestConnectionContract.parse(data);
  }
  
  static validateSettings(type: DestinationType, settings: unknown): Record<string, unknown> {
    const contract = DestinationSettingsContract.options.find(c => c.shape.type.value === type);
    if (!contract) {
      throw new Error(`Unknown destination type: ${type}`);
    }
    return contract.shape.settings.parse(settings);
  }
}

// Error handling helpers
export class ApiErrorHandler {
  static createValidationError(errors: z.ZodError): ApiError {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: errors.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
      statusCode: 400,
    };
  }
  
  static createNotFoundError(resource: string, id: string): ApiError {
    return {
      error: 'NOT_FOUND',
      message: `${resource} with id ${id} not found`,
      statusCode: 404,
    };
  }
  
  static createUnauthorizedError(): ApiError {
    return {
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
      statusCode: 401,
    };
  }
  
  static createForbiddenError(): ApiError {
    return {
      error: 'FORBIDDEN',
      message: 'Insufficient permissions',
      statusCode: 403,
    };
  }
}
```

### Self-Hosted Integration Note
```typescript
// For self-hosted users, they continue using direct configuration:
// This API is ONLY for consent.io control plane dashboard

// Self-hosted example:
const instance = await c15tInstance({
  analytics: {
    destinations: [
      posthog({ apiKey: 'phc_their_key' }),
      metaPixel({ pixelId: '123', accessToken: 'their_token' }),
    ],
  },
});

// Consent.io SaaS users manage destinations through this API + dashboard
```

## 🧪 Testing Requirements
- Unit tests for API contracts
- Validation schema tests
- Error handling tests
- Type safety tests
- Contract integration tests

## 🔍 Definition of Done
- [ ] CRUD operation contracts defined
- [ ] Validation schemas implemented
- [ ] Response types defined
- [ ] Error handling contracts
- [ ] Comprehensive JSDoc comments
- [ ] Unit tests for contracts
- [ ] Code review completed

## 📚 Related Documentation
- [Cloud Configuration](../docs/analytics-cloud-configuration.md)
- [Analytics Type-Safe API](../docs/analytics-type-safe-api.md)

## 🔗 Dependencies
- [3.1: Database Schema](./12-database-schema.md) ✅

## 🚀 Next Ticket
[3.3: Implement Admin API Handlers](./14-admin-api-handlers.md)
