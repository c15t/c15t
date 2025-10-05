# Phase 1: Core Analytics Infrastructure (8 days)

## 🎯 Phase Goal
Build the foundational analytics system with server-side destinations

## 📋 Phase Structure

### Epic: Phase 1 - Core Analytics Infrastructure

#### Ticket 1.1: Create Core Analytics Types & Interfaces
**Estimate**: 1 day  
**Priority**: Critical  
**Description**: Define the foundational types and interfaces for the analytics system

**Acceptance Criteria**:
- [ ] Create `AnalyticsEvent` union type (track, page, identify, group, alias, consent)
- [ ] Create `EventContext` interface with session, user, consent data
- [ ] Create `AnalyticsConsent` interface with consent purposes
- [ ] Create `DestinationPlugin` interface for server-side destinations
- [ ] Create `DestinationConfig<T>` generic type
- [ ] Add comprehensive JSDoc comments
- [ ] Unit tests for all types

**Files to Create**:
- `packages/backend/src/v2/analytics/types.ts`
- `packages/backend/src/v2/analytics/types.test.ts`

**Definition of Done**:
- [ ] All types defined with proper TypeScript interfaces
- [ ] JSDoc comments for all public APIs
- [ ] Unit tests with 100% coverage
- [ ] Code review completed
- [ ] Documentation updated

---

#### Ticket 1.2: Implement Destination Registry & Manager
**Estimate**: 2 days  
**Priority**: Critical  
**Description**: Build the core destination management system

**Acceptance Criteria**:
- [ ] Create `DestinationRegistry` class with register/get methods
- [ ] Create `DestinationManager` class with loadDestinations/processEvents
- [ ] Implement eager loading (lazy loading in Phase 2)
- [ ] Add error handling per destination
- [ ] Add comprehensive logging
- [ ] Unit tests with 90%+ coverage
- [ ] Integration tests with mock destinations

**Files to Create**:
- `packages/backend/src/v2/analytics/destination-registry.ts`
- `packages/backend/src/v2/analytics/destination-manager.ts`
- `packages/backend/src/v2/analytics/destination-registry.test.ts`
- `packages/backend/src/v2/analytics/destination-manager.test.ts`

**Definition of Done**:
- [ ] Registry can register and retrieve destination factories
- [ ] Manager can load destinations from config
- [ ] Manager can process events through destinations
- [ ] Error handling isolates failures per destination
- [ ] Comprehensive logging for debugging
- [ ] Unit tests with 90%+ coverage
- [ ] Integration tests passing
- [ ] Code review completed

---

#### Ticket 1.3: Create Event Processor
**Estimate**: 1 day  
**Priority**: Critical  
**Description**: Build the event processing pipeline

**Acceptance Criteria**:
- [ ] Create `EventProcessor` class
- [ ] Implement event validation (Standard Schema)
- [ ] Implement event enrichment (add context)
- [ ] Implement global event filtering
- [ ] Add consent-based filtering per destination
- [ ] Handle consent events specially (send to all destinations)
- [ ] Unit tests for all processing steps

**Files to Create**:
- `packages/backend/src/v2/analytics/event-processor.ts`
- `packages/backend/src/v2/analytics/event-processor.test.ts`

**Definition of Done**:
- [ ] Events validated against Standard Schema
- [ ] Events enriched with context data
- [ ] Global filtering applied
- [ ] Consent filtering per destination
- [ ] Consent events sent to all destinations
- [ ] Unit tests for all processing steps
- [ ] Code review completed

---

#### Ticket 1.4: Create Core Server Destinations
**Estimate**: 2 days  
**Priority**: Critical  
**Description**: Implement PostHog and Console destinations

**Acceptance Criteria**:
- [ ] Create `PostHogDestination` class implementing `DestinationPlugin`
- [ ] Create `ConsoleDestination` class for debugging
- [ ] Implement Zod validation for settings
- [ ] Add connection testing
- [ ] Add proper error handling
- [ ] Unit tests for both destinations
- [ ] Integration tests with real APIs

**Files to Create**:
- `packages/destinations/src/posthog.ts`
- `packages/destinations/src/console.ts`
- `packages/destinations/src/posthog.test.ts`
- `packages/destinations/src/console.test.ts`

**Definition of Done**:
- [ ] PostHog destination sends events to PostHog API
- [ ] Console destination logs events to console
- [ ] Settings validated with Zod schemas
- [ ] Connection testing implemented
- [ ] Error handling for API failures
- [ ] Unit tests for both destinations
- [ ] Integration tests with real APIs
- [ ] Code review completed

---

#### Ticket 1.5: Create Analytics Handler & API
**Estimate**: 1 day  
**Priority**: Critical  
**Description**: Build the HTTP handler for analytics events

**Acceptance Criteria**:
- [ ] Create `POST /analytics/process` endpoint
- [ ] Validate request body (events array + consent)
- [ ] Process events through EventProcessor
- [ ] Return success/error responses
- [ ] Add request logging
- [ ] Add rate limiting
- [ ] Unit tests for handler
- [ ] Integration tests with real requests

**Files to Create**:
- `packages/backend/src/v2/handlers/analytics/process.handler.ts`
- `packages/backend/src/v2/handlers/analytics/process.handler.test.ts`

**Definition of Done**:
- [ ] HTTP endpoint accepts events and consent
- [ ] Request validation implemented
- [ ] Events processed through pipeline
- [ ] Proper HTTP responses returned
- [ ] Request logging added
- [ ] Rate limiting implemented
- [ ] Unit tests for handler
- [ ] Integration tests with real requests
- [ ] Code review completed

---

#### Ticket 1.6: Create c15tInstance Factory
**Estimate**: 1 day  
**Priority**: Critical  
**Description**: Build the main factory function for creating analytics instances

**Acceptance Criteria**:
- [ ] Create `c15tInstance` function
- [ ] Accept `C15TOptions` with analytics config
- [ ] Initialize DestinationManager
- [ ] Load destinations from config
- [ ] Return context with handler
- [ ] Add proper error handling
- [ ] Unit tests for factory
- [ ] Integration tests with full flow

**Files to Create**:
- `packages/backend/src/v2/init.ts`
- `packages/backend/src/v2/init.test.ts`

**Definition of Done**:
- [ ] Factory function creates analytics instance
- [ ] Options validated and processed
- [ ] DestinationManager initialized
- [ ] Destinations loaded from config
- [ ] Context returned with handler
- [ ] Error handling implemented
- [ ] Unit tests for factory
- [ ] Integration tests with full flow
- [ ] Code review completed

---

## 🎯 Phase 1 Deliverable
**Working analytics system with PostHog + Console destinations**

### Success Criteria
- [ ] Basic analytics events (track, page, identify) working
- [ ] PostHog destination sending events to PostHog API
- [ ] Console destination logging events for debugging
- [ ] HTTP API accepting and processing events
- [ ] All unit tests passing (90%+ coverage)
- [ ] Integration tests passing
- [ ] Performance within 10% of event-sidekick

### Go/No-Go Decision
**Go Criteria**:
- All tests passing
- Basic analytics flow working end-to-end
- Performance benchmarks met
- Code review completed

**No-Go Criteria**:
- Critical bugs in core functionality
- Performance regression > 10%
- Security vulnerabilities
- Integration test failures

## 🔄 Dependencies
- None (this is the foundation phase)

## 📊 Metrics
- **Code Coverage**: 90%+ for all new code
- **Performance**: Within 10% of event-sidekick
- **Test Coverage**: All critical paths covered
- **Bug Count**: Zero critical bugs

## 🚀 Next Phase
Once Phase 1 is complete, proceed to [Phase 2: Universal Destinations](./epic-phase-2-universal-destinations.md)
