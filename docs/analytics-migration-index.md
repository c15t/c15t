# Analytics Migration Documentation Index

Complete documentation for migrating event-sidekick and event-detective into c15t v2 backend.

## 🎫 Implementation Tickets (27 Tickets, 5 Phases)

### **Phase 1: Core Analytics Infrastructure** (6 tickets, 21 story points)
- [Ticket 1.1: Core Analytics Types](../tickets/1.1-core-analytics-types.md) (3 pts) - Foundational type system
- [Ticket 1.2: Destination Registry & Manager](../tickets/1.2-destination-registry-manager.md) (5 pts) - Plugin orchestration
- [Ticket 1.3: Event Processor](../tickets/1.3-event-processor.md) (3 pts) - Validation and enrichment pipeline
- [Ticket 1.4: Core Server Destinations](../tickets/1.4-core-server-destinations.md) (5 pts) - PostHog + Console implementations
- [Ticket 1.5: Analytics Handler & API](../tickets/1.5-analytics-handler-api.md) (3 pts) - HTTP endpoints
- [Ticket 1.6: c15tInstance Factory](../tickets/1.6-c15t-instance-factory.md) (2 pts) - Main initialization API

### **Phase 2: Universal Destinations** (6 tickets, 18 story points)
- [Ticket 2.1: Universal Destination Interface](../tickets/2.1-universal-destination-interface.md) (2 pts) - Server + client support
- [Ticket 2.2: Scripts Endpoint](../tickets/2.2-scripts-endpoint.md) (3 pts) - Dynamic script generation
- [Ticket 2.3: Meta Pixel Universal](../tickets/2.3-meta-pixel-universal.md) (5 pts) - Conversions API + Pixel script
- [Ticket 2.4: Google Analytics Universal](../tickets/2.4-google-analytics-universal.md) (5 pts) - Measurement Protocol + gtag.js
- [Ticket 2.5: Frontend Integration](../tickets/2.5-frontend-integration.md) (3 pts) - React components update
- [Ticket 2.6: Frontend Integration Updates](../tickets/2.6-frontend-integration-updates.md) (0 pts) - Additional refinements

### **Phase 3: Advanced Features** (6 tickets, 20 story points)
- [Ticket 3.1: Event Queue & Offline Support](../tickets/3.1-event-queue-offline-support.md) (5 pts) - Client-side queuing
- [Ticket 3.2: Debug API](../tickets/3.2-debug-api.md) (2 pts) - Development tools
- [Ticket 3.3: Lazy Loading](../tickets/3.3-lazy-loading.md) (3 pts) - Performance optimization
- [Ticket 3.4: Error Handling & Retry Logic](../tickets/3.4-error-handling-retry.md) (5 pts) - Resilience
- [Ticket 3.5: Dynamic Script Loading Hook](../tickets/3.5-dynamic-script-loading.md) (3 pts) - Script management
- [Ticket 3.6: Consent State Synchronization](../tickets/3.6-consent-state-sync.md) (2 pts) - Cross-tab sync

### **Phase 4: Migration & Compatibility** (3 tickets, 8 story points)
- [Ticket 4.1: Migration Tooling](../tickets/4.1-migration-tooling.md) (3 pts) - event-sidekick transition
- [Ticket 4.2: Deprecation Warnings](../tickets/4.2-deprecation-warnings.md) (2 pts) - Gradual migration
- [Ticket 4.3: Frontend Consent Flow](../tickets/4.3-frontend-consent-flow.md) (3 pts) - Unified consent management

### **Phase 5: Cloud Configuration** (6 tickets, 23 story points)
- [Ticket 5.1: Database Schema](../tickets/5.1-database-schema.md) (3 pts) - Cloud destination storage
- [Ticket 5.2: Consent Backend API Contracts](../tickets/5.2-consent-backend-api-contracts.md) (2 pts) - API definitions
- [Ticket 5.3: Consent Backend API Handlers](../tickets/5.3-consent-backend-api-handlers.md) (5 pts) - Backend implementation
- [Ticket 5.4: Database Loading](../tickets/5.4-database-loading.md) (3 pts) - Dynamic destination loading
- [Ticket 5.5: Consent Dashboard UI Components](../tickets/5.5-consent-dashboard-ui-components.md) (8 pts) - Frontend interface
- [Ticket 5.6: Scripts Endpoint Database](../tickets/5.6-scripts-endpoint-database.md) (2 pts) - Database-driven scripts
- [Ticket 5.7: Consent Integration](../tickets/5.7-consent-integration.md) (0 pts) - Final integration

**Total**: 27 tickets, 90 story points (~18-20 working days)

## 🚀 Quick Start for Developers

**Ready to start coding?** Jump straight to implementation:

1. **Backend Developers**: Start with [Ticket 1.1: Core Analytics Types](../tickets/1.1-core-analytics-types.md)
2. **Frontend Developers**: Start with [Ticket 2.5: Frontend Integration](../tickets/2.5-frontend-integration.md)
3. **DevOps/Infrastructure**: Start with [Ticket 5.1: Database Schema](../tickets/5.1-database-schema.md)

**Need context first?** Read the documentation below, then return to tickets.

## 📚 Documentation Structure

### 0. [Why c15t? Competitive Advantage](./analytics-competitive-advantage.md) 🏆 **VALUE PROPOSITION**
**Why choose c15t over Segment/OneTrust/others (15 min read)**
- Complete competitive analysis
- c15t vs Segment comparison
- c15t vs OneTrust comparison
- 10 unique capabilities no competitor has
- Value propositions by customer type
- Strategic moat explanation
- Objection handling

**Best for**: Understanding WHY c15t wins, sales enablement, business strategy

### 0b. [Destination Packages Strategy](./analytics-destination-packages-strategy.md) 📦 **PACKAGE STRUCTURE**
**Mono-package vs multi-package analysis (20 min read)**
- One package (@c15t/destinations) vs many (@c15t-destinations/posthog, etc.)
- Bundle size, versioning, discovery trade-offs
- Recommendation: Start mono, split later if needed
- Browser + server integration in one destination
- Migration path between approaches
- Decision matrix and real-world examples

**Best for**: Understanding package structure decisions, future scalability planning

### 0c. [Complete System Overview](./analytics-complete-system-overview.md) 🎯 **BIG PICTURE**
**Visual overview of the entire system (10 min read)**
- All features integrated in one diagram
- Configuration sources (code, database, runtime)
- Multi-tenant architecture
- Self-service flow
- Security layers
- Extended timeline (20 days with cloud config)

**Best for**: Getting the complete technical picture before diving into details

### 1. [Executive Summary](./analytics-migration-summary.md) ⭐ **START HERE**
**Quick overview in 5 minutes**
- What we're building
- Three critical requirements
- Strategic business value
- Timeline and success criteria

### 2. [Migration Plan](./migration-plan-event-sidekick.md) 📋 **DETAILED STRATEGY**
**Complete migration strategy (30 min read)**
- Current state analysis
- Architecture design
- GDPR-first consent management
- Lazy loading & runtime registration
- Implementation phases
- Breaking changes
- Migration path from event-sidekick

**Best for**: Understanding the full scope and making architectural decisions

### 3. [Type-Safe API Design](./analytics-type-safe-api.md) 💻 **TYPE DEFINITIONS**
**Exact TypeScript interfaces (20 min read)**
- Event type definitions
- DestinationPlugin interface  
- Configuration builder
- Usage examples with type inference

**Best for**: Implementing the TypeScript interfaces

### 4. [Implementation Roadmap](./analytics-implementation-roadmap.md) 🗓️ **DAY-BY-DAY PLAN**
**10-day implementation schedule (25 min read)**
- Specific file structure
- Day-by-day tasks
- Code snippets for each component
- Testing strategy

**Best for**: Project management and tracking implementation progress

### 5. [Package Architecture](./analytics-package-architecture.md) 📦 **SEPARATION STRATEGY**
**Why and how to separate packages (15 min read)**
- Backend vs Destinations separation
- Dependency flow
- Publishing strategy
- Bundle optimization

**Best for**: Understanding package boundaries and versioning strategy

### 6. [Key Improvements](./analytics-key-improvements.md) ⚡ **WHAT'S NEW**
**Three major architectural improvements (20 min read)**
- Standard Schema support (validator-agnostic)
- Lazy loading with runtime registration
- GDPR-first consent management
- Strategic business benefit of dual-CMP

**Best for**: Understanding what makes this better than event-sidekick

### 7. [Architecture Diagrams](./analytics-architecture-diagram.md) 🎨 **VISUAL GUIDE**
**Visual flow diagrams (15 min read)**
- Complete system flow
- Consent-based filtering
- Lazy loading process
- Enterprise migration scenario
- Package dependencies

**Best for**: Visual learners, architecture reviews, presentations

### 8. [Universal Destinations (Server + Client)](./analytics-universal-destinations.md) 🌐 **SCRIPTS INTEGRATION**
**How frontend scripts integrate with backend destinations (25 min read)**
- Universal destination protocol
- Server-side handlers + client-side scripts from one config
- Meta Pixel, Google Analytics, TikTok examples
- Script generation API
- Migration from @c15t/scripts package
- Type safety across frontend and backend

**Best for**: Understanding how destinations control both server events and client scripts

### 9. [consent.io Control Plane Architecture](./analytics-consent-io-architecture.md) ☁️ **CONTROL PLANE (IMPORTANT)**
**How consent.io cloud actually works - isolated workers per customer (30 min read)**
- ⚠️ **Corrects previous multi-tenant assumption**
- Control plane generates worker configs
- Isolated worker + database per customer
- Config generator implementation
- Deployment strategies (auto, manual, GitOps)
- No runtime database queries (config baked in)
- Type-safe generated code
- Customer self-service

**Best for**: Understanding how consent.io managed hosting works, correct architecture

### 9b. [Cloud Configuration (Reference)](./analytics-cloud-configuration.md) 📚 **ALTERNATIVE APPROACH**
**Alternative: Database-driven runtime config (30 min read)**
- ⚠️ **Note**: This shows runtime DB loading approach
- ⚠️ **For reference only**: consent.io uses generated configs instead
- May be useful for self-hosted scenarios with different architecture
- Database schema, admin API, multi-tenant patterns

**Best for**: Reference if building different deployment model than consent.io

### 10. [Frontend Integration & Unified Consent](./analytics-frontend-integration.md) 🔄 **DEPRECATION GUIDE**
**How to integrate analytics and deprecate old consent saving logic (25 min read)**
- Unified consent flow (one way to save consent)
- Deprecate `saveConsents()` → direct `/consent/set` calls
- New `analytics.consent()` method
- Backend handles consent event → calls `/consent/set` internally
- Migration strategy with backwards compatibility
- React/Next.js integration examples
- Graceful degradation and rollback strategy

**Best for**: Frontend developers migrating to unified consent flow, understanding deprecation path

## Quick Navigation

### By Role

**👨‍💼 Product Manager / Business**
1. Read: [Competitive Advantage](./analytics-competitive-advantage.md) (why c15t wins)
2. Read: [Executive Summary](./analytics-migration-summary.md)
3. Read: [Key Improvements](./analytics-key-improvements.md) (business value section)
4. Review: [consent.io Control Plane](./analytics-consent-io-architecture.md) (managed hosting)
5. Review: [Architecture Diagrams](./analytics-architecture-diagram.md) (Enterprise migration)

**👨‍💻 Backend Developer**
1. Read: [Executive Summary](./analytics-migration-summary.md)
2. Study: [Type-Safe API Design](./analytics-type-safe-api.md)
3. Study: [Universal Destinations](./analytics-universal-destinations.md) (scripts integration)
4. Follow: [Implementation Roadmap](./analytics-implementation-roadmap.md)
5. Reference: [Migration Plan](./migration-plan-event-sidekick.md) as needed

**🏗️ Tech Lead / Architect**
1. Read: [Competitive Advantage](./analytics-competitive-advantage.md) (strategic moat)
2. Read: [Executive Summary](./analytics-migration-summary.md)
3. Study: [Migration Plan](./migration-plan-event-sidekick.md) (full context)
4. Review: [Package Architecture](./analytics-package-architecture.md)
5. **IMPORTANT**: [consent.io Control Plane](./analytics-consent-io-architecture.md) (deployment model)
6. Validate: [Architecture Diagrams](./analytics-architecture-diagram.md)

**🎨 Frontend Developer**
1. Read: [Executive Summary](./analytics-migration-summary.md)
2. **IMPORTANT**: [Frontend Integration](./analytics-frontend-integration.md) → Unified consent flow
3. Study: [Universal Destinations](./analytics-universal-destinations.md) → Script loading patterns
4. Focus: [Migration Plan](./migration-plan-event-sidekick.md) → "Consent Flow" section
5. Review: Cookie banner integration examples

**📊 Data Engineer**
1. Read: [Executive Summary](./analytics-migration-summary.md)
2. Study: [Architecture Diagrams](./analytics-architecture-diagram.md) → "Consent Scenario"
3. Review: Event filtering and routing logic

## Key Concepts Explained

### Standard Schema
**Where to learn**: [Key Improvements](./analytics-key-improvements.md) → Section 1
**Why it matters**: Supports any validation library (Zod, ArkType, Valibot)

### Lazy Loading
**Where to learn**: [Migration Plan](./migration-plan-event-sidekick.md) → Section 2b
**Why it matters**: Faster startup, runtime destination management

### Consent Event Type
**Where to learn**: [Key Improvements](./analytics-key-improvements.md) → Section 3
**Why it matters**: GDPR compliance built-in, normalizes cookie banners

### Package Separation
**Where to learn**: [Package Architecture](./analytics-package-architecture.md)
**Why it matters**: Destinations updated independently from backend

### Dual-CMP Strategy
**Where to learn**: [Migration Plan](./migration-plan-event-sidekick.md) → "Strategic Business Benefit"
**Why it matters**: Enterprise sales advantage, zero-risk migration

## Implementation Checklist

### Phase 1: Core Infrastructure (Days 1-3)
- [ ] Create event types with Standard Schema support
- [ ] Implement DestinationPlugin interface
- [ ] Build DestinationRegistry
- [ ] Create DestinationConfig types
- [ ] Implement consent filtering logic

**Documents**: [Type-Safe API](./analytics-type-safe-api.md), [Implementation Roadmap](./analytics-implementation-roadmap.md)

### Phase 2: Destination Manager (Days 4-5)
- [ ] Refactor DestinationManager for lazy loading
- [ ] Add runtime registration methods
- [ ] Implement consent-based filtering
- [ ] Add lifecycle management
- [ ] Add retry logic

**Documents**: [Implementation Roadmap](./analytics-implementation-roadmap.md), [Architecture Diagrams](./analytics-architecture-diagram.md)

### Phase 3: Destinations Package (Days 6-8)
- [ ] Set up @c15t/destinations package structure
- [ ] Migrate PostHog to new plugin interface
- [ ] Add Console destination (debugging)
- [ ] Add Mixpanel destination
- [ ] Add Google Analytics destination
- [ ] Implement auto-registration

**Documents**: [Package Architecture](./analytics-package-architecture.md), [Type-Safe API](./analytics-type-safe-api.md)

### Phase 4: Integration & Testing (Days 9-10)
- [ ] Update examples (Cloudflare Worker, Next.js)
- [ ] Write migration guide
- [ ] Create custom destination tutorial
- [ ] Add comprehensive tests
- [ ] Document consent event integration

**Documents**: All documents for reference

## Common Questions

### Q: Why not just use Segment?
**A**: Segment has no GDPR consent management. We need consent filtering built-in, not bolted on. See [Key Improvements](./analytics-key-improvements.md) → Section 3.

### Q: Why separate packages for destinations?
**A**: Destinations update frequently (bugs, new features). Backend updates rarely (protocol changes). See [Package Architecture](./analytics-package-architecture.md).

### Q: Why Standard Schema instead of just Zod?
**A**: Developers using ArkType/Valibot can create custom destinations. No vendor lock-in. See [Key Improvements](./analytics-key-improvements.md) → Section 1.

### Q: What's the enterprise migration strategy?
**A**: Dual-write to c15t + OneTrust during transition. Remove OneTrust when ready. See [Migration Plan](./migration-plan-event-sidekick.md) → "Strategic Business Benefit".

### Q: How does consent event integrate with existing /consent/set?
**A**: Consent events are dual-purpose: sent to analytics destinations AND recorded via /consent/set. See [Architecture Diagrams](./analytics-architecture-diagram.md).

### Q: Can destinations be added at runtime?
**A**: Yes! `destinationManager.addDestination(config)`. Enables feature flags and A/B testing. See [Key Improvements](./analytics-key-improvements.md) → Section 2.

### Q: How do frontend scripts (Meta Pixel, GA tag) integrate with backend destinations?
**A**: Universal destinations implement `generateScript()` to provide client-side scripts. One config controls both server handlers and client scripts. See [Universal Destinations](./analytics-universal-destinations.md).

### Q: What happens to @c15t/scripts package?
**A**: Deprecated in favor of universal destinations. Scripts are now generated from destination configs. Migration path provided. See [Universal Destinations](./analytics-universal-destinations.md) → "Migration from @c15t/scripts".

### Q: Can destinations be configured via database/UI instead of code?
**A**: YES! Store destination configs in database, load at startup or runtime. Enables multi-tenant SaaS, self-service onboarding, and no-code management. See [Cloud Configuration](./analytics-cloud-configuration.md).

### Q: How do we build a multi-tenant SaaS where each customer configures their own destinations?
**A**: Use cloud configuration with organization-scoped destinations. Each customer manages their own Meta Pixel, GA, etc. via admin UI. See [Cloud Configuration](./analytics-cloud-configuration.md) → "Multi-Tenant Configuration".

### Q: How do we integrate analytics into the frontend and deprecate the old consent saving logic?
**A**: Use the new unified consent flow where `analytics.consent()` replaces direct `/consent/set` calls. Backend handles consent events and calls `/consent/set` internally. See [Frontend Integration](./analytics-frontend-integration.md).

### Q: Won't this break existing consent functionality during migration?
**A**: No! The new flow has backwards compatibility. It tries analytics first, falls back to old path if analytics fails. Feature flags allow gradual rollout. See [Frontend Integration](./analytics-frontend-integration.md) → "Backwards Compatibility".

## Example Code Snippets

### Basic Setup
```typescript
import { c15tInstance } from '@c15t/backend/v2';
import { posthog } from '@c15t/destinations';

const instance = c15tInstance({
	adapter: myAdapter,
	trustedOrigins: ['https://example.com'],
	analytics: {
		destinations: [
			posthog({ apiKey: env.POSTHOG_KEY })
		]
	}
});
```

### Enterprise Setup (Dual-CMP)
```typescript
import { c15tInstance } from '@c15t/backend/v2';
import { posthog, consent, onetrust } from '@c15t/destinations';

const instance = c15tInstance({
	analytics: {
		destinations: [
			posthog({ apiKey: env.POSTHOG_KEY }),
			consent({ apiKey: env.C15T_KEY }),      // c15t Consent
			onetrust({ apiKey: env.ONETRUST_KEY }), // Legacy (during migration)
		]
	}
});
```

### Custom Destination
```typescript
import { type } from 'arktype'; // Using ArkType!
import type { DestinationPlugin } from '@c15t/backend/v2/types';

class MyDestination implements DestinationPlugin {
	readonly settingsSchema = type({ apiKey: 'string' });
	readonly requiredConsent = ['measurement'];
	
	async track(event, context) { /* ... */ }
}
```

## Resources

- [Standard Schema Spec](https://standardschema.dev/)
- [Zod Library Authors Guide](https://zod.dev/library-authors)
- [c15t Consent Management Contracts](../packages/backend/src/v2/contracts/consent/post.contract.ts)

## Status

- ✅ Planning complete (16 comprehensive documents, ~350 pages)
- ✅ Architecture approved
- ✅ Package strategy decided (mono-package @c15t/destinations)
- ✅ Destination metadata added (name, description, icon, category)
- ✅ Enhanced error handling designed (onError, throwErrors, debug)
- ✅ Code-based configuration designed
- ✅ consent.io control plane architecture designed
- ✅ Universal destinations (server + client) designed
- ✅ Frontend integration strategy designed
- ✅ Unified consent flow (deprecation path) designed
- ✅ Competitive advantage analysis complete
- ⏳ Ready for implementation (20 days)

## Next Action

**Start Phase 1, Day 1**: Create event types and plugin interface

See [Implementation Roadmap](./analytics-implementation-roadmap.md) for detailed next steps.

---

**Questions or feedback?** Review relevant document above or ask! 🚀
