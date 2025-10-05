# Analytics Implementation Roadmap

This document provides a detailed, ticket-based implementation plan aligned with our 27-ticket, 5-phase structure.

## ⚠️ Critical Architecture Decision

**Destinations MUST live in `@c15t/destinations` package, NOT in `@c15t/backend`.**

**Why?** Destinations are numerous and update frequently. We cannot publish a new backend release every time a destination changes.

**What this means:**
- **Backend** defines only the interface/protocol (`DestinationPlugin`, `DestinationConfig`)
- **Destinations** package implements all specific destinations (PostHog, Mixpanel, etc.)
- **Destinations** are versioned and published independently
- **Users** import builders from `@c15t/destinations`, not backend

**Import pattern:**
```typescript
import { c15tInstance } from '@c15t/backend/v2';
import { posthog, mixpanel } from '@c15t/destinations';  // ← Separate package!
```

## 🎫 Implementation Phases (27 Tickets)

### **Phase 1: Core Analytics Infrastructure** (6 tickets, 21 story points)

#### **Ticket 1.1: Core Analytics Types** (3 story points)
**Files to Update:**
- `packages/core/src/analytics/types.ts` (extend existing types)
- `packages/backend/src/v2/handlers/analytics/core-types.ts` (extend existing types)

**Key Deliverables:**
- `AnalyticsEvent` union type (track, page, identify, group, alias, consent)
- `EventContext` interface with session, user, consent data
- `AnalyticsConsent` interface with consent purposes
- `DestinationPlugin` interface for server-side destinations
- `DestinationConfig<T>` generic type
- Comprehensive JSDoc comments and unit tests

#### **Ticket 1.2: Destination Registry & Manager** (5 story points)
**Files to Update:**
- `packages/backend/src/v2/plugins/destination-registry.ts` (extend existing registry)
- `packages/backend/src/v2/handlers/analytics/` (add manager)

**Key Deliverables:**
- `DestinationRegistry` class with register/get methods
- `DestinationManager` class with loadDestinations/processEvents
- Eager loading implementation (lazy loading in Phase 3)
- Error handling per destination (isolated failures)
- Comprehensive logging and 90%+ test coverage

#### **Ticket 1.3: Event Processor** (3 story points)
**Files to Update:**
- `packages/core/src/analytics/queue.ts` (extend existing queue)
- `packages/backend/src/v2/handlers/analytics/` (add processor)

**Key Deliverables:**
- `EventProcessor` class for validation and enrichment
- Event validation using Standard Schema
- Event enrichment with context data
- Global event filtering
- Consent-based filtering per destination
- Special handling for consent events

#### **Ticket 1.4: Core Server Destinations** (5 story points)
**Files to Create:**
- `packages/backend/src/v2/handlers/analytics/destinations/` (add new destinations)

**Key Deliverables:**
- `PostHogDestination` class implementing `DestinationPlugin`
- `ConsoleDestination` class for debugging
- Zod validation for settings
- Connection testing capabilities
- Proper error handling
- Unit and integration tests

#### **Ticket 1.5: Analytics Handler & API** (3 story points)
**Files to Update:**
- `packages/backend/src/v2/handlers/analytics/` (extend existing handlers)

**Key Deliverables:**
- `POST /analytics/process` endpoint
- Request body validation (events array + consent)
- Event processing through EventProcessor
- Success/error responses
- Request logging and rate limiting
- Unit and integration tests

#### **Ticket 1.6: c15tInstance Factory** (2 story points)
**Files to Update:**
- `packages/backend/src/v2/init.ts` (extend existing init)

**Key Deliverables:**
- `c15tInstance` function accepting `C15TOptions`
- DestinationManager initialization
- Destination loading from config
- Context object with handlers and utilities
- Proper error handling
- Unit and integration tests

### **Phase 2: Universal Destinations** (6 tickets, 18 story points)

#### **Ticket 2.1: Universal Destination Interface** (2 story points)
**Files to Update:**
- `packages/backend/src/v2/handlers/analytics/core-types.ts` (extend existing interface)

**Key Deliverables:**
- `UniversalDestinationPlugin` interface extending `DestinationPlugin`
- `generateScript` method signature
- `Script` type for script definitions
- Backward compatibility with existing destinations
- Unit tests for new interface

#### **Ticket 2.2: Scripts Endpoint** (3 story points)
**Files to Update:**
- `packages/backend/src/v2/handlers/analytics/` (add scripts handler)

**Key Deliverables:**
- `GET /analytics/scripts` endpoint
- Consent preferences as query parameters
- Script generation from enabled destinations
- Script definitions in proper format
- Caching headers and error handling
- Unit tests for endpoint

#### **Ticket 2.3: Meta Pixel Universal Destination** (5 story points)
**Files to Create:**
- `packages/destinations/src/meta-pixel.ts`
- `packages/destinations/src/meta-pixel.test.ts`

**Key Deliverables:**
- `MetaPixelDestination` class implementing `UniversalDestinationPlugin`
- Server-side Conversions API calls
- Client-side pixel script generation
- Zod validation for settings
- Connection testing and error handling
- Unit and integration tests

#### **Ticket 2.4: Google Analytics Universal Destination** (5 story points)
**Files to Create:**
- `packages/destinations/src/google-analytics.ts`
- `packages/destinations/src/google-analytics.test.ts`

**Key Deliverables:**
- `GoogleAnalyticsDestination` class implementing `UniversalDestinationPlugin`
- Server-side Measurement Protocol calls
- Client-side gtag.js script generation
- Zod validation for settings
- Connection testing and error handling
- Unit and integration tests

#### **Ticket 2.5: Frontend Integration** (3 story points)
**Files to Update:**
- `packages/core/src/client/` (extend existing client)

**Key Deliverables:**
- Updated `ConsentManagerProvider` to fetch scripts dynamically
- Script loading/unloading based on consent changes
- Error handling for script failures
- Loading states implementation
- Unit tests for script management
- Integration tests with real scripts

#### **Ticket 2.6: Frontend Integration Updates** (0 story points)
**Files to Update:**
- `packages/react/src/components/consent-manager-provider.tsx`
- `packages/react/src/hooks/use-analytics-scripts.ts`
- `packages/react/src/components/consent-banner.tsx`
- `packages/react/src/components/analytics-provider.tsx`

**Key Deliverables:**
- Updated components to work with new analytics system
- Consent state synchronization integration
- Script management integration
- Event queue integration
- Error handling integration
- Backward compatibility maintenance

### **Phase 3: Advanced Features** (6 tickets, 20 story points)

#### **Ticket 3.1: Event Queue & Offline Support** (5 story points)
**Files to Create:**
- `packages/core/src/analytics/event-queue.ts`
- `packages/core/src/analytics/offline-storage.ts`

**Key Deliverables:**
- `EventQueue` class with offline support
- Event batching and retry mechanisms
- Consent-aware event queuing
- Offline storage using IndexedDB
- Queue persistence and recovery
- Unit and integration tests

#### **Ticket 3.2: Debug API** (2 story points)
**Files to Create:**
- `packages/core/src/analytics/debug.ts`

**Key Deliverables:**
- `analytics.debug.getQueue()` method
- `analytics.debug.getDestinations()` method
- `analytics.debug.getConsent()` method
- `analytics.debug.getStats()` method
- Development tools integration
- Unit tests for debug API

#### **Ticket 3.3: Lazy Loading** (3 story points)
**Files to Update:**
- `packages/backend/src/v2/handlers/analytics/destination-manager.ts`

**Key Deliverables:**
- Lazy loading implementation for destinations
- Runtime destination registration
- Performance optimization
- Memory usage optimization
- Unit and performance tests

#### **Ticket 3.4: Error Handling & Retry Logic** (5 story points)
**Files to Create:**
- `packages/core/src/analytics/error-handler.ts`
- `packages/core/src/analytics/retry-logic.ts`

**Key Deliverables:**
- Exponential backoff implementation
- Circuit breaker pattern
- Dead letter queue
- Error isolation per destination
- Comprehensive error handling
- Unit and integration tests

#### **Ticket 3.5: Dynamic Script Loading Hook** (3 story points)
**Files to Create:**
- `packages/react/src/hooks/use-script-manager.ts`

**Key Deliverables:**
- `useScriptManager` hook implementation
- Script loading/unloading management
- Consent-aware script management
- Error handling for script failures
- Performance optimization
- Unit and integration tests

#### **Ticket 3.6: Consent State Synchronization** (2 story points)
**Files to Create:**
- `packages/core/src/analytics/consent-sync.ts`

**Key Deliverables:**
- Cross-tab consent synchronization
- Real-time consent state updates
- Conflict resolution strategies
- Performance optimization
- Unit and integration tests

### **Phase 4: Migration & Compatibility** (3 tickets, 8 story points)

#### **Ticket 4.1: Migration Tooling** (3 story points)
**Files to Create:**
- `packages/scripts/migrate-event-sidekick.ts`
- `packages/scripts/migrate-event-detective.ts`

**Key Deliverables:**
- Migration scripts for event-sidekick
- Migration scripts for event-detective
- Compatibility layer implementation
- Migration validation tools
- Documentation and examples
- Unit and integration tests

#### **Ticket 4.2: Deprecation Warnings** (2 story points)
**Files to Update:**
- `packages/core/src/analytics/` (add deprecation warnings)

**Key Deliverables:**
- Deprecation warnings for old APIs
- Gradual migration path
- Backward compatibility maintenance
- Migration documentation
- Unit tests for deprecation warnings

#### **Ticket 4.3: Frontend Consent Flow** (3 story points)
**Files to Update:**
- `packages/react/src/components/consent-manager-provider.tsx`

**Key Deliverables:**
- Unified consent flow implementation
- Automatic destination sync
- Consent state management
- Error handling and loading states
- Unit and integration tests

### **Phase 5: Cloud Configuration** (6 tickets, 23 story points)

#### **Ticket 5.1: Database Schema** (3 story points)
**Files to Create:**
- `packages/backend/src/v2/database/schema/analytics.sql`

**Key Deliverables:**
- Database schema for cloud-configurable destinations
- Organization and environment support
- Destination configuration storage
- Migration scripts
- Unit tests for schema

#### **Ticket 5.2: Consent Backend API Contracts** (2 story points)
**Files to Create:**
- `packages/backend/src/v2/contracts/consent-backend.ts`

**Key Deliverables:**
- API contracts for consent backend
- TypeScript interfaces
- Validation schemas
- Documentation
- Unit tests for contracts

#### **Ticket 5.3: Consent Backend API Handlers** (5 story points)
**Files to Create:**
- `packages/backend/src/v2/handlers/consent-backend/`

**Key Deliverables:**
- API handlers for consent backend
- CRUD operations for destinations
- Organization and environment management
- Authentication and authorization
- Unit and integration tests

#### **Ticket 5.4: Database Loading** (3 story points)
**Files to Create:**
- `packages/backend/src/v2/database/analytics-loader.ts`

**Key Deliverables:**
- Database loading implementation
- Dynamic destination loading
- Caching and performance optimization
- Error handling
- Unit and integration tests

#### **Ticket 5.5: Consent Dashboard UI Components** (8 story points)
**Files to Create:**
- `packages/dashboard/src/components/` (multiple files)

**Key Deliverables:**
- Consent dashboard UI components
- Destination management interface
- Organization and environment management
- User authentication and authorization
- Responsive design
- Unit and integration tests

#### **Ticket 5.6: Scripts Endpoint Database** (2 story points)
**Files to Update:**
- `packages/backend/src/v2/handlers/analytics/scripts.handler.ts`

**Key Deliverables:**
- Database-driven scripts endpoint
- Dynamic script generation from database
- Performance optimization
- Caching implementation
- Unit and integration tests

#### **Ticket 5.7: Consent Integration** (0 story points)
**Files to Update:**
- Multiple files across packages

**Key Deliverables:**
- Final integration of all components
- End-to-end testing
- Performance optimization
- Documentation updates
- Production readiness

## 📁 File Structure

```
packages/backend/src/v2/handlers/analytics/
├── index.ts                      # Public exports
├── types.ts                      # Re-exports and legacy types (deprecate gradually)
├── consent.ts                    # Consent types (already exists)
├── events.ts                     # ✨ NEW: Event type definitions with Zod schemas
├── destination-plugin.ts         # ✨ NEW: Core plugin interface
├── destination-registry.ts       # ✨ NEW: Plugin registry system
├── destination-manager.ts        # 🔄 REFACTOR: Update to use new plugin interface
├── config-builder.ts             # ✨ NEW: Type-safe config builder
├── event-processor.ts            # ✨ NEW: Event processing pipeline
├── consent-filter.ts             # ✨ NEW: GDPR consent filtering
├── validation.ts                 # 🔄 UPDATE: Add more validation helpers
├── health.handler.ts             # 🔄 UPDATE: Use new destination interface
└── process.handler.ts            # 🔄 UPDATE: Use new event processor

packages/destinations/src/
├── index.ts                      # Export all destinations
├── types.ts                      # Shared destination types
├── posthog/
│   ├── index.ts                  # 🔄 REFACTOR: Use new plugin interface
│   ├── settings.ts               # ✨ NEW: Settings schema
│   └── __tests__/
├── mixpanel/                     # ✨ NEW: Mixpanel destination
│   ├── index.ts
│   ├── settings.ts
│   └── __tests__/
├── google-analytics/             # ✨ NEW: GA4 destination
│   ├── index.ts
│   ├── settings.ts
│   └── __tests__/
└── console/                      # ✨ NEW: Debug destination
    ├── index.ts
    └── __tests__/

packages/backend/src/v2/
├── types/
│   ├── analytics.ts              # 🔄 UPDATE: Add AnalyticsOptions
│   └── index.ts                  # 🔄 UPDATE: Export analytics types
├── contracts/
│   └── analytics.ts              # 🔄 UPDATE: Update contracts
└── init.ts                       # 🔄 UPDATE: Initialize new destination manager

examples/cloudflare-worker/src/
└── index.ts                      # 🔄 UPDATE: Use new API
```

## 🎯 Success Criteria

### **Phase 1 Complete** ✅
- [ ] All 6 tickets implemented and tested
- [ ] Working analytics system with PostHog + Console destinations
- [ ] All tests passing (90%+ coverage)
- [ ] Basic analytics flow working end-to-end
- [ ] Performance within 10% of event-sidekick

### **Phase 2 Complete** ✅
- [ ] Universal destinations working with both server-side events and client-side scripts
- [ ] Meta Pixel + Google Analytics working end-to-end
- [ ] Frontend integration updated
- [ ] All tests passing

### **Phase 3 Complete** ✅
- [ ] Event queue with offline support implemented
- [ ] Debug API functional
- [ ] Lazy loading optimized
- [ ] Error handling robust
- [ ] Script management complete
- [ ] Consent synchronization working

### **Phase 4 Complete** ✅
- [ ] Migration tooling functional
- [ ] Deprecation warnings implemented
- [ ] Frontend consent flow unified
- [ ] Backward compatibility maintained

### **Phase 5 Complete** ✅
- [ ] Database schema implemented
- [ ] Consent backend API complete
- [ ] Dashboard UI functional
- [ ] Database-driven scripts working
- [ ] Full consent.io integration complete

## 🚀 Getting Started

1. **Review Tickets**: Start with [Ticket 1.1: Core Analytics Types](../tickets/1.1-core-analytics-types.md)
2. **Set Up Environment**: Install dependencies and create feature branch
3. **Follow Dependencies**: Complete tickets in dependency order
4. **Test Continuously**: Maintain 90%+ test coverage
5. **Demo Each Phase**: Show progress after each phase completion

## 📚 Related Documentation

- [Analytics Migration Index](./analytics-migration-index.md) - Navigation hub
- [Analytics Type-Safe API](./analytics-type-safe-api.md) - Type definitions
- [Universal Destinations](./analytics-universal-destinations.md) - Server + client scripts
- [Frontend Integration](./analytics-frontend-integration.md) - React components

**Ready to start?** Begin with [Ticket 1.1: Core Analytics Types](../tickets/1.1-core-analytics-types.md) 🚀