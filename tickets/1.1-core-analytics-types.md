# Ticket 1.1: Core Analytics Types

## 📋 Ticket Details
**Phase**: 1 - Core Analytics Infrastructure  
**Story Points**: 3  
**Priority**: Critical  
**Assignee**: TBD  
**Status**: Ready

## 🔗 Dependencies
**Depends on**: None (foundational ticket)  
**Blocking**: All Phase 1 tickets  

## 🎯 Description
Define the foundational types and interfaces for the analytics system. This ticket establishes the core type system that all other analytics components will build upon. The types must be comprehensive, well-documented, and designed for extensibility.

## 🧠 Context & Background
This is the foundation of the entire analytics system. These types will be used by:
- Event processing pipeline
- Destination plugins
- Frontend integration
- Admin UI components
- Migration tooling

The types must support:
- GDPR consent management
- Universal destinations (server + client)
- Multi-tenant architecture
- Type safety with Standard Schema
- Extensibility for custom destinations

## ✅ Acceptance Criteria
- [ ] Create `AnalyticsEvent` union type (track, page, identify, group, alias, consent)
- [ ] Create `EventContext` interface with session, user, consent data
- [ ] Create `AnalyticsConsent` interface with consent purposes
- [ ] Create `DestinationPlugin` interface for server-side destinations
- [ ] Create `DestinationConfig<T>` generic type
- [ ] Add comprehensive JSDoc comments
- [ ] Unit tests for all types

## 📁 Files to Update
- `packages/core/src/analytics/types.ts` (extend existing types)
- `packages/backend/src/v2/handlers/analytics/core-types.ts` (extend existing types)

## 🔧 Implementation Details

### Extend Existing Types
The core package already has comprehensive analytics types. This ticket focuses on:

1. **Adding missing event types** to existing `AnalyticsEvent` interface
2. **Extending destination interfaces** in backend core-types.ts
3. **Adding consent event type** for GDPR compliance
4. **Enhancing type safety** with better generics

### Key Changes Needed
```typescript
// Add to packages/core/src/analytics/types.ts
export interface ConsentEvent extends AnalyticsEvent {
  type: 'consent';
  action: 'granted' | 'revoked' | 'updated';
  preferences: AnalyticsConsent;
  source: 'banner' | 'api' | 'consent-dashboard' | string;
}

// Add to packages/backend/src/v2/handlers/analytics/core-types.ts
export interface DestinationPlugin<TSettings = Record<string, unknown>> {
  readonly type: string;
  readonly version: string;
  readonly gdprCompliant: boolean;
  readonly settingsSchema: StandardSchemaV1<TSettings>;
  readonly requiredConsent: ReadonlyArray<ConsentPurpose>;
  
  // Lifecycle methods
  initialize(settings: TSettings): Promise<void>;
  testConnection(): Promise<boolean>;
  
  // Event handlers
  track?(event: TrackEvent, context: EventContext): Promise<void>;
  page?(event: PageEvent, context: EventContext): Promise<void>;
  identify?(event: IdentifyEvent, context: EventContext): Promise<void>;
  group?(event: GroupEvent, context: EventContext): Promise<void>;
  alias?(event: AliasEvent, context: EventContext): Promise<void>;
  consent?(event: ConsentEvent, context: EventContext): Promise<void>;
}
```

### Event Context
```typescript
export interface EventContext {
  // Session data
  sessionId: string;
  sessionStart: Date;
  
  // User data
  userId?: string;
  anonymousId?: string;
  
  // Consent state
  consent: AnalyticsConsent;
  
  // Request context
  userAgent?: string;
  ip?: string;
  referrer?: string;
  
  // Custom context
  custom?: Record<string, unknown>;
}
```

### Consent Management
```typescript
export interface AnalyticsConsent {
  necessary: boolean;
  measurement: boolean;
  marketing: boolean;
  functionality: boolean;
  experience: boolean;
}

export type ConsentPurpose = keyof AnalyticsConsent;
```

### Destination Plugin Interface
```typescript
export interface DestinationPlugin<TSettings = Record<string, unknown>> {
  readonly type: string;
  readonly version: string;
  readonly gdprCompliant: boolean;
  readonly settingsSchema: StandardSchemaV1<TSettings>;
  readonly requiredConsent: ReadonlyArray<ConsentPurpose>;
  
  // Lifecycle methods
  initialize(settings: TSettings): Promise<void>;
  testConnection(): Promise<boolean>;
  
  // Event handlers
  track?(event: TrackEvent, context: EventContext): Promise<void>;
  page?(event: PageEvent, context: EventContext): Promise<void>;
  identify?(event: IdentifyEvent, context: EventContext): Promise<void>;
  group?(event: GroupEvent, context: EventContext): Promise<void>;
  alias?(event: AliasEvent, context: EventContext): Promise<void>;
  consent?(event: ConsentEvent, context: EventContext): Promise<void>;
  
  // Lifecycle hooks
  onBeforeEvent?(event: AnalyticsEvent): Promise<AnalyticsEvent>;
  onAfterEvent?(event: AnalyticsEvent, result: EventResult): Promise<void>;
  onError?(error: Error, event: AnalyticsEvent): Promise<void>;
  destroy?(): Promise<void>;
}
```

### Configuration Types
```typescript
export interface DestinationConfig<TSettings = Record<string, unknown>> {
  type: string;
  enabled: boolean;
  settings: TSettings;
  requiredConsent: ReadonlyArray<ConsentPurpose>;
}

export interface C15TOptions {
  analytics?: {
    enabled?: boolean;
    destinations?: DestinationConfig[];
    loadFromDatabase?: boolean;
    organizationId?: string;
    environment?: string;
  };
}
```

## 🧪 Testing Requirements
- Unit tests for all type definitions
- Type compatibility tests
- JSDoc validation
- TypeScript compilation tests
- Interface compliance tests

## 🔍 Definition of Done
- [ ] All types defined with proper TypeScript interfaces
- [ ] JSDoc comments for all public APIs
- [ ] Unit tests with 100% coverage
- [ ] TypeScript compilation passes
- [ ] Code review completed
- [ ] Documentation updated

## 📚 Related Documentation
- [Analytics Type-Safe API](../docs/analytics-type-safe-api.md)
- [Analytics Architecture Diagram](../docs/analytics-architecture-diagram.md)

## 🔗 Dependencies
- None (foundational ticket)

## 🚀 Next Ticket
[1.2: Destination Registry & Manager](./02-destination-registry-manager.md)

## 🎯 Phase 1 Complete
Once this ticket is done, Phase 1 is complete! You should have:
- ✅ Working analytics system with PostHog + Console destinations
- ✅ All tests passing (90%+ coverage)
- ✅ Basic analytics flow working end-to-end
- ✅ Performance within 10% of event-sidekick
