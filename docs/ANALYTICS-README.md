# Analytics Migration: Complete Planning Documentation

## 🎯 Quick Start

**New to this project?** Start here:

1. Read [analytics-migration-summary.md](./analytics-migration-summary.md) (5 min)
2. Read [analytics-competitive-advantage.md](./analytics-competitive-advantage.md) (15 min)
3. Review [analytics-migration-index.md](./analytics-migration-index.md) (navigation hub)

## 📋 What We're Building

**c15t v2 Analytics**: A GDPR-first, type-safe analytics system that:
- ✅ Replaces Segment + OneTrust with one platform
- ✅ Supports server-side + client-side tracking
- ✅ Enforces consent automatically (code-level)
- ✅ Works alongside existing tools (unique migration path)
- ✅ Configures via code OR UI (flexibility)
- ✅ Is fully open source + self-hostable

## 🏆 Why This Matters

**c15t is the only platform that combines:**
- Analytics (like Segment)
- Consent Management (like OneTrust)
- Developer Experience (type-safe, extensible)
- Control Plane (managed deployment)

**No competitor has all four.** This is our strategic moat.

## 📚 Complete Documentation (16 Documents)

### Strategy & Business (3 docs)
- **analytics-competitive-advantage.md** - Why c15t wins
- **analytics-destination-packages-strategy.md** - Package structure decisions
- **analytics-migration-summary.md** - Executive overview

### Architecture (5 docs)
- **analytics-consent-io-architecture.md** - How control plane works ⚠️ **CRITICAL**
- **analytics-complete-system-overview.md** - Big picture diagram
- **analytics-package-architecture.md** - Separation rationale
- **analytics-key-improvements.md** - 4 major upgrades
- **analytics-architecture-diagram.md** - Visual flows

### Technical Design (4 docs)
- **migration-plan-event-sidekick.md** - Complete strategy
- **analytics-type-safe-api.md** - TypeScript interfaces
- **analytics-universal-destinations.md** - Server + client scripts
- **analytics-frontend-integration.md** - Unified consent flow

### Implementation (3 docs)
- **analytics-implementation-roadmap.md** - 20-day plan
- **analytics-cloud-configuration.md** - Alternative approach (reference)
- **analytics-comparison-getanalytics.md** - Internal validation

### Navigation (1 doc)
- **analytics-migration-index.md** - Documentation hub

**Total**: ~350 pages

## ✅ Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Package Structure** | Mono-package (`@c15t/destinations`) | Simpler launch, split later if needed |
| **Validator** | Standard Schema | Support any validator (Zod, ArkType, Valibot) |
| **Loading** | Lazy loading | Faster startup, runtime management |
| **Consent** | First-class citizen | GDPR built-in, not bolted on |
| **Scripts** | Universal destinations | One config for server + client |
| **Deployment** | consent.io control plane | Isolated workers, generated configs |
| **Frontend** | Unified consent flow | analytics.consent() replaces direct API |
| **Metadata** | Added to destinations | name, description, icon, category |
| **Error Handling** | Enhanced | onError, throwErrors, debug mode |
| **Browser + Server** | In one destination | Universal pattern |

## 🎯 Core Architecture

```
┌─────────────────────────────────────────┐
│  Frontend                                │
│  - analytics.track()                    │
│  - analytics.consent() ← NEW!           │
└────────────┬────────────────────────────┘
             │ POST /analytics/process
             ↓
┌─────────────────────────────────────────┐
│  Backend (@c15t/backend)                │
│  - Protocol/interface definition         │
│  - DestinationManager (orchestrator)    │
│  - Consent filtering (automatic)        │
└────────────┬────────────────────────────┘
             │ Loads from
             ↓
┌─────────────────────────────────────────┐
│  Destinations (@c15t/destinations)      │
│  - One package with all destinations    │
│  - PostHog, Meta Pixel, GA4, etc.       │
│  - Server + Client in each              │
│  - Versioned independently              │
└─────────────────────────────────────────┘
```

## 🚀 What Makes c15t Unique

### 1. Only Platform with GDPR + Analytics
- Segment: Analytics only
- OneTrust: Consent only
- c15t: Both integrated

### 2. Only Platform with Multi-CMP Support
- Run c15t + OneTrust simultaneously
- Migrate gradually with zero risk
- Unique enterprise sales advantage

### 3. Only Platform with Universal Destinations
- One config controls server handlers + client scripts
- Meta Pixel: Conversions API + Pixel script
- Google Analytics: Measurement Protocol + gtag.js

### 4. Only Platform with Control Plane
- Code OR UI configuration
- Isolated workers per customer
- Generated type-safe configs

### 5. Only Platform with Standard Schema
- Use any validator (Zod, ArkType, Valibot)
- Full type inference
- Runtime validation

### 6. Only Platform with Consent Event Type
- Dedicated event for consent changes
- Tracked in analytics
- Saved to compliance DB
- Scripts load/unload automatically

### 7. Only Open Source Full-Stack Platform
- Complete transparency
- Self-hostable
- Community-driven

## 💡 Key Innovations

### Unified Consent Flow
```typescript
// OLD: Two separate calls
await manager.setConsent({ ... });     // Consent management
await analytics.track('Event', { ... });  // Analytics

// NEW: One call does both
await analytics.consent({ ... }, 'granted');
// → Saves consent to DB
// → Tracks in analytics
// → Loads scripts
```

### Universal Destinations
```typescript
// One config controls both
metaPixel({
  pixelId: '123',        // Client script
  accessToken: 'xxx'     // Server API
})
// → Client: Loads pixel
// → Server: Sends to API
```

### consent.io Control Plane
```
Customer configures in UI
    ↓
Control plane generates TypeScript config
    ↓
Deploys isolated worker
    ↓
Customer's worker has type-safe baked-in config
```

## 📅 Implementation Timeline (5 Phases, 27 Tickets)

### **Phase 1: Core Analytics Infrastructure** (6 tickets, 21 story points)
- **1.1**: Core Analytics Types (3 pts) - Foundational type system
- **1.2**: Destination Registry & Manager (5 pts) - Plugin orchestration
- **1.3**: Event Processor (3 pts) - Validation and enrichment pipeline
- **1.4**: Core Server Destinations (5 pts) - PostHog + Console implementations
- **1.5**: Analytics Handler & API (3 pts) - HTTP endpoints
- **1.6**: c15tInstance Factory (2 pts) - Main initialization API

### **Phase 2: Universal Destinations** (6 tickets, 18 story points)
- **2.1**: Universal Destination Interface (2 pts) - Server + client support
- **2.2**: Scripts Endpoint (3 pts) - Dynamic script generation
- **2.3**: Meta Pixel Universal (5 pts) - Conversions API + Pixel script
- **2.4**: Google Analytics Universal (5 pts) - Measurement Protocol + gtag.js
- **2.5**: Frontend Integration (3 pts) - React components update
- **2.6**: Frontend Integration Updates (0 pts) - Additional refinements

### **Phase 3: Advanced Features** (6 tickets, 20 story points)
- **3.1**: Event Queue & Offline Support (5 pts) - Client-side queuing
- **3.2**: Debug API (2 pts) - Development tools
- **3.3**: Lazy Loading (3 pts) - Performance optimization
- **3.4**: Error Handling & Retry Logic (5 pts) - Resilience
- **3.5**: Dynamic Script Loading Hook (3 pts) - Script management
- **3.6**: Consent State Synchronization (2 pts) - Cross-tab sync

### **Phase 4: Migration & Compatibility** (3 tickets, 8 story points)
- **4.1**: Migration Tooling (3 pts) - event-sidekick transition
- **4.2**: Deprecation Warnings (2 pts) - Gradual migration
- **4.3**: Frontend Consent Flow (3 pts) - Unified consent management

### **Phase 5: Cloud Configuration** (6 tickets, 23 story points)
- **5.1**: Database Schema (3 pts) - Cloud destination storage
- **5.2**: Consent Backend API Contracts (2 pts) - API definitions
- **5.3**: Consent Backend API Handlers (5 pts) - Backend implementation
- **5.4**: Database Loading (3 pts) - Dynamic destination loading
- **5.5**: Consent Dashboard UI Components (8 pts) - Frontend interface
- **5.6**: Scripts Endpoint Database (2 pts) - Database-driven scripts
- **5.7**: Consent Integration (0 pts) - Final integration

**Total**: 27 tickets, 90 story points (~18-20 working days)

## 🎊 Success Metrics

When complete:
- [ ] 100% type safety (no `any` in public API)
- [ ] Standard Schema working with Zod, ArkType, Valibot
- [ ] Lazy loading (destinations load on first use)
- [ ] Runtime registration (add/remove at runtime)
- [ ] GDPR enforcement automatic
- [ ] Consent event integrated with /consent/set
- [ ] Scripts generated from destinations
- [ ] Universal destinations working (server + client)
- [ ] Metadata on all destinations (name, description, icon)
- [ ] Enhanced error handling (onError, debug)
- [ ] Frontend unified consent flow
- [ ] At least 8 destinations implemented
- [ ] Mono-package @c15t/destinations shipped
- [ ] Complete documentation
- [ ] All tests passing (>80% coverage)

## 🔑 Critical Files to Implement

### Backend
1. `packages/backend/src/v2/handlers/analytics/events.ts`
2. `packages/backend/src/v2/handlers/analytics/destination-plugin.ts`
3. `packages/backend/src/v2/handlers/analytics/destination-registry.ts`
4. `packages/backend/src/v2/handlers/analytics/destination-manager.ts`
5. `packages/backend/src/v2/handlers/analytics/scripts.handler.ts`
6. `packages/backend/src/v2/types/analytics.ts`

### Destinations
1. `packages/destinations/src/posthog/index.ts`
2. `packages/destinations/src/meta-pixel/index.ts`
3. `packages/destinations/src/google-analytics/index.ts`
4. `packages/destinations/src/console/index.ts`
5. `packages/destinations/src/index.ts` (exports + registration)

### Frontend
1. `packages/core/src/analytics/consent.ts` (add createConsentEvent)
2. `packages/core/src/analytics/utils.ts` (add consent() method)
3. `packages/core/src/store.ts` (update saveConsents to use analytics)
4. `packages/react/src/hooks/use-analytics-scripts.ts`

## 🎫 Ticket Navigation

### **Phase 1: Core Analytics Infrastructure**
- [Ticket 1.1: Core Analytics Types](../tickets/1.1-core-analytics-types.md) - Foundational types
- [Ticket 1.2: Destination Registry & Manager](../tickets/1.2-destination-registry-manager.md) - Plugin system
- [Ticket 1.3: Event Processor](../tickets/1.3-event-processor.md) - Processing pipeline
- [Ticket 1.4: Core Server Destinations](../tickets/1.4-core-server-destinations.md) - PostHog + Console
- [Ticket 1.5: Analytics Handler & API](../tickets/1.5-analytics-handler-api.md) - HTTP endpoints
- [Ticket 1.6: c15tInstance Factory](../tickets/1.6-c15t-instance-factory.md) - Main API

### **Phase 2: Universal Destinations**
- [Ticket 2.1: Universal Destination Interface](../tickets/2.1-universal-destination-interface.md) - Server + client
- [Ticket 2.2: Scripts Endpoint](../tickets/2.2-scripts-endpoint.md) - Dynamic scripts
- [Ticket 2.3: Meta Pixel Universal](../tickets/2.3-meta-pixel-universal.md) - Facebook tracking
- [Ticket 2.4: Google Analytics Universal](../tickets/2.4-google-analytics-universal.md) - GA4 tracking
- [Ticket 2.5: Frontend Integration](../tickets/2.5-frontend-integration.md) - React components
- [Ticket 2.6: Frontend Integration Updates](../tickets/2.6-frontend-integration-updates.md) - Refinements

### **Phase 3: Advanced Features**
- [Ticket 3.1: Event Queue & Offline Support](../tickets/3.1-event-queue-offline-support.md) - Client queuing
- [Ticket 3.2: Debug API](../tickets/3.2-debug-api.md) - Development tools
- [Ticket 3.3: Lazy Loading](../tickets/3.3-lazy-loading.md) - Performance
- [Ticket 3.4: Error Handling & Retry Logic](../tickets/3.4-error-handling-retry.md) - Resilience
- [Ticket 3.5: Dynamic Script Loading Hook](../tickets/3.5-dynamic-script-loading.md) - Script management
- [Ticket 3.6: Consent State Synchronization](../tickets/3.6-consent-state-sync.md) - Cross-tab sync

### **Phase 4: Migration & Compatibility**
- [Ticket 4.1: Migration Tooling](../tickets/4.1-migration-tooling.md) - event-sidekick transition
- [Ticket 4.2: Deprecation Warnings](../tickets/4.2-deprecation-warnings.md) - Gradual migration
- [Ticket 4.3: Frontend Consent Flow](../tickets/4.3-frontend-consent-flow.md) - Unified consent

### **Phase 5: Cloud Configuration**
- [Ticket 5.1: Database Schema](../tickets/5.1-database-schema.md) - Cloud storage
- [Ticket 5.2: Consent Backend API Contracts](../tickets/5.2-consent-backend-api-contracts.md) - API definitions
- [Ticket 5.3: Consent Backend API Handlers](../tickets/5.3-consent-backend-api-handlers.md) - Backend logic
- [Ticket 5.4: Database Loading](../tickets/5.4-database-loading.md) - Dynamic loading
- [Ticket 5.5: Consent Dashboard UI Components](../tickets/5.5-consent-dashboard-ui-components.md) - Frontend UI
- [Ticket 5.6: Scripts Endpoint Database](../tickets/5.6-scripts-endpoint-database.md) - Database scripts
- [Ticket 5.7: Consent Integration](../tickets/5.7-consent-integration.md) - Final integration

## 📖 Documentation by Audience

### For Product/Business
→ Read [analytics-competitive-advantage.md](./analytics-competitive-advantage.md)

### For Architects
→ Read [analytics-consent-io-architecture.md](./analytics-consent-io-architecture.md)

### For Backend Developers
→ Read [analytics-type-safe-api.md](./analytics-type-safe-api.md)
→ Follow [analytics-implementation-roadmap.md](./analytics-implementation-roadmap.md)
→ Start with [Ticket 1.1: Core Analytics Types](../tickets/1.1-core-analytics-types.md)

### For Frontend Developers
→ Read [analytics-frontend-integration.md](./analytics-frontend-integration.md)
→ Read [analytics-universal-destinations.md](./analytics-universal-destinations.md)
→ Start with [Ticket 2.5: Frontend Integration](../tickets/2.5-frontend-integration.md)

### For Everyone
→ Start with [analytics-migration-index.md](./analytics-migration-index.md)

## 🚧 Next Steps

1. ✅ **DONE**: Complete planning (16 documents + 27 tickets)
2. **NEXT**: Review and approve ticket structure
3. Create feature branch: `feat/analytics-migration`
4. Install dependencies: `@standard-schema/spec`
5. **Start Phase 1**: Begin with [Ticket 1.1: Core Analytics Types](../tickets/1.1-core-analytics-types.md)
6. Follow tickets in dependency order
7. Demo after each phase completion
8. Ship in 18-20 days! 🚀

## 🎯 Phase Completion Criteria

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

## 💼 Business Impact

**This platform enables c15t to:**
- Win against Segment (better GDPR, lower cost)
- Win against OneTrust (includes analytics, migration-friendly)
- Win against both (unified platform at 1/10th cost)
- Serve developers (code config, type-safe, open source)
- Serve non-technical users (UI config, self-service)
- Serve enterprises (multi-CMP support, gradual migration)

**Market opportunity**: Companies spending $50k-200k/year on Segment + OneTrust can get everything in c15t for $0-30k/year.

**TAM**: Every SaaS company with EU customers (thousands of companies, billions in market size)

## 🎯 The Strategic Moat

**c15t doesn't compete with Segment OR OneTrust.**

**c15t replaces BOTH while working alongside EITHER.**

That's the moat. 🏰

---

**Questions?** See [analytics-migration-index.md](./analytics-migration-index.md) for navigation.

**Ready to build?** See [analytics-implementation-roadmap.md](./analytics-implementation-roadmap.md) for Day 1 tasks.

**Let's ship this!** 🚀
