# Analytics Migration: Executive Summary

## What We're Building

A **GDPR-first, type-safe analytics system** that migrates event-sidekick and event-detective into c15t v2 backend, with support for custom destinations and seamless CMP integration.

## Four Critical Requirements Addressed

### 1. ✅ Separate Package Architecture
**Requirement**: "We can't push an update to `@c15t/backend` every time a destination changes"

**Solution**: 
- Backend defines the protocol (`DestinationPlugin` interface)
- Destinations live in `@c15t/destinations` (versioned independently)
- Backend updates: Quarterly. Destinations updates: Weekly.

### 2. ✅ Validator-Agnostic Type Safety
**Requirement**: "Support custom type libraries like ArkType in custom plugins"

**Solution**:
- Use [Standard Schema](https://standardschema.dev/) instead of Zod-only
- Developers can use Zod, ArkType, Valibot, or any validator
- Full type inference preserved

### 3. ✅ GDPR-First Consent Management
**Requirement**: "Taking GDPR specs into account, only send to destinations user consented to"

**Solution**:
- New `consent` event type (not in Segment spec)
- Consent included in every event batch
- Automatic filtering per destination based on consent
- Integrates with existing `/consent/set` endpoint

### 4. ✅ Universal Destinations (Server + Client Scripts)
**Requirement**: "How do we feed server destinations and frontend scripts to be typesafe with the universal system?"

**Solution**:
- Destinations can implement `generateScript()` to provide client-side scripts
- Single configuration controls both server handlers AND client scripts
- Meta Pixel: Conversions API (server) + Pixel script (client)
- Google Analytics: Measurement Protocol (server) + gtag.js (client)
- Scripts automatically generated based on consent
- Type-safe across backend and frontend

## Strategic Business Value

### Multi-CMP Support = Enterprise Sales Advantage

```typescript
// Enterprise customers can run c15t alongside OneTrust
const instance = c15tInstance({
	analytics: {
		destinations: [
			consent({ apiKey: 'xxx' }),      // c15t (primary)
			onetrust({ apiKey: 'yyy' }),     // OneTrust (during migration)
		]
	}
});

// Migrate: Remove 1 line from config
// Downtime: 0 minutes
// Risk: Minimal (can re-enable instantly)
```

**Sales pitch**: "We work alongside your existing OneTrust. No rip-and-replace."

**Result**: Lower sales friction → faster deals → land enterprise customers → migrate them over time

## Architecture at a Glance

```
┌──────────────────────────────────────────────┐
│  Frontend (c15t)                       │
│  - Event Detective (already migrated)        │
│  - Consent management                        │
│  - Cookie banner integration                 │
└────────────────┬─────────────────────────────┘
                 │ Sends: events + consent
                 ↓
┌──────────────────────────────────────────────┐
│  Backend (@c15t/backend)                     │
│  ✓ Defines DestinationPlugin protocol        │
│  ✓ Event processing pipeline                 │
│  ✓ GDPR consent filtering                    │
│  ✓ Lazy loading                              │
│  ✓ Runtime registration                      │
│  ❌ NO destination implementations           │
└────────────────┬─────────────────────────────┘
                 │ Loads destinations from registry
                 ↓
┌──────────────────────────────────────────────┐
│  Destinations (@c15t/destinations)           │
│  ✓ PostHog, Mixpanel, GA4, Console           │
│  ✓ OneTrust, Cookiebot (CMP sync)           │
│  ✓ Auto-registers on import                  │
│  ✓ Versioned independently                   │
└──────────────────────────────────────────────┘
```

## Developer Experience

### Simple Setup (Server-Only Destination)
```typescript
import { c15tInstance } from '@c15t/backend/v2';
import { posthog } from '@c15t/destinations';

const instance = c15tInstance({
	adapter: myAdapter,
	trustedOrigins: ['https://example.com'],
	analytics: {
		destinations: [
			posthog({ apiKey: env.POSTHOG_KEY })  // Server-only
		]
	}
});
```

### Universal Setup (Server + Client Scripts)
```typescript
import { c15tInstance } from '@c15t/backend/v2';
import { metaPixel, googleAnalytics } from '@c15t/destinations';

// Backend config
const instance = c15tInstance({
	analytics: {
		destinations: [
			metaPixel({
				pixelId: env.META_PIXEL_ID,
				accessToken: env.META_ACCESS_TOKEN,  // For server Conversions API
			}),
			googleAnalytics({
				measurementId: env.GA_ID,
				apiSecret: env.GA_SECRET,  // For server Measurement Protocol
			}),
		]
	}
});

// Frontend: Scripts auto-generated from destinations
export async function getScripts(consent: AnalyticsConsent) {
	return await instance.getClientScripts(consent);
}
```

```tsx
// app/layout.tsx
import { ConsentManagerProvider } from '@c15t/react';
import { getScripts } from './analytics';

export default async function RootLayout({ children }) {
	// Fetch scripts based on default consent
	const scripts = await getScripts({
		necessary: true,
		measurement: false,
		marketing: false,
		functionality: false,
		experience: false,
	});
	
	return (
		<ConsentManagerProvider
			options={{
				backendUrl: '/api/c15t',
				scripts,  // Meta Pixel and GA scripts auto-included!
			}}
		>
			{children}
		</ConsentManagerProvider>
	);
}
```

**Result**:
- ✅ Single config for server + client
- ✅ Scripts automatically load based on consent
- ✅ Type-safe configuration
- ✅ No duplicate configs
- ✅ Server and client events use same IDs (deduplication)

### Custom Destination (< 100 lines)
```typescript
import { type, StandardSchemaV1 } from '@standard-schema/spec';
import type { DestinationPlugin } from '@c15t/backend/v2/types';

// Use any validator (ArkType here)
const MySettingsSchema = type({
	apiKey: 'string',
	endpoint: 'string.url'
});

class MyDestination implements DestinationPlugin {
	readonly type = 'my-custom';
	readonly settingsSchema = MySettingsSchema;
	readonly requiredConsent = ['measurement'];
	
	async initialize(settings) { /* ... */ }
	async track(event, context) { /* ... */ }
}

export const myDestination = async (settings) => {
	const dest = new MyDestination();
	await dest.initialize(settings);
	return dest;
};

export const myCustom = (settings, enabled = true) => ({
	type: 'my-custom',
	enabled,
	settings
});
```

## Consent Flow (GDPR Compliance)

```typescript
/**
 * 1. User clicks "Accept Marketing Only" on cookie banner
 */
analytics.updateConsent({
	necessary: true,
	measurement: false,
	marketing: true,      // ← Only this granted
	functionality: false,
	experience: false,
});

/**
 * 2. Consent event sent to backend
 */
// Processed by:
// - Analytics destinations (PostHog, etc.)
// - c15t consent management (/consent/set)
// - Optional CMP destinations (OneTrust, Cookiebot)

/**
 * 3. User triggers event
 */
analytics.track('Product Viewed', { productId: '123' });

/**
 * 4. Backend automatically routes based on consent
 */
// PostHog (needs measurement)      → ❌ NOT sent
// Meta Pixel (needs marketing)     → ✅ SENT
// Google Analytics (needs measurement) → ❌ NOT sent
// Console (needs necessary)        → ✅ SENT
```

**Key Point**: Developer doesn't check consent manually. System enforces it automatically.

## Implementation Timeline

### Week 1: Core Infrastructure
- Day 1-2: Event types, plugin interface, Standard Schema support
- Day 3-4: Registry, lazy loading, config builder
- Day 5: Event processor, consent filtering

### Week 2: Destinations & Manager
- Day 6-7: Refactor DestinationManager, add lifecycle
- Day 8-9: Migrate PostHog, add Console destination
- Day 10: Add Mixpanel, Google Analytics

### Week 3: Integration & Polish
- Day 11-12: Update examples, write migration guide
- Day 13-14: Testing, bug fixes, documentation
- Day 15: Release!

## Success Criteria

- [x] ✅ Plan complete and approved
- [ ] Backend defines protocol only (no destination implementations)
- [ ] Destinations package versioned independently
- [ ] Standard Schema support (any validator works)
- [ ] Lazy loading with runtime registration
- [ ] New `consent` event type with c15t integration
- [ ] Automatic GDPR-compliant event filtering
- [ ] Developer can add custom destination in < 100 lines
- [ ] At least 4 destinations implemented
- [ ] Migration guide with examples
- [ ] All tests passing

## Documents Created (16 Total, ~350 Pages)

1. **analytics-competitive-advantage.md** - Why c15t wins vs Segment/OneTrust
2. **analytics-destination-packages-strategy.md** - Mono vs multi-package analysis (NEW!)
3. **analytics-consent-io-architecture.md** - ⚠️ **IMPORTANT**: How consent.io control plane works
4. **analytics-complete-system-overview.md** - Big picture with all features integrated
5. **analytics-frontend-integration.md** - Frontend integration and unified consent flow
6. **migration-plan-event-sidekick.md** - Complete migration strategy with architecture design
7. **analytics-type-safe-api.md** - Detailed TypeScript interfaces and usage examples
8. **analytics-implementation-roadmap.md** - Day-by-day implementation tasks (20 days)
9. **analytics-package-architecture.md** - Package separation rationale and benefits
10. **analytics-key-improvements.md** - Summary of four major improvements
11. **analytics-universal-destinations.md** - Server + client scripts integration
12. **analytics-cloud-configuration.md** - Reference: Alternative runtime DB loading approach
13. **analytics-architecture-diagram.md** - Visual flow diagrams
14. **analytics-comparison-getanalytics.md** - Internal: Architecture validation (reference only)
15. **analytics-migration-summary.md** (this document) - Executive overview
16. **analytics-migration-index.md** - Navigation hub for all docs

### Package Strategy Decision

**Decision**: Start with mono-package `@c15t/destinations`, split to `@c15t-destinations/*` later if needed.

**Rationale**: Simpler initial launch, better discovery, modern bundlers tree-shake well anyway. Can split non-breaking when we hit 20+ destinations or bundle size becomes an issue. See [Destination Packages Strategy](./analytics-destination-packages-strategy.md) for full analysis.

### ⚠️ Important Note on Cloud Architecture

**consent.io uses isolated workers per customer**, not shared multi-tenant backend:
- Each customer gets their own Cloudflare Worker
- Each customer has their own database (Turso)
- Control plane generates worker config from UI settings
- Config is baked into worker code (not loaded at runtime)
- See [consent.io Control Plane Architecture](./analytics-consent-io-architecture.md) for details

## Key Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Where do destinations live? | `@c15t/destinations` package | Independent versioning, faster iteration |
| Which validator to use? | Standard Schema | Support any validator (Zod, ArkType, Valibot) |
| How to load destinations? | Lazy loading | Faster startup, lower memory |
| How to handle consent? | First-class citizen | GDPR compliance built-in |
| CMP provider field? | No - use destination plugins | Cleaner, extensible, enables dual-CMP |
| Segment Actions compatibility? | No | Clean break for better architecture |
| Cloud-configurable destinations? | Yes - via control plane | consent.io generates worker configs |
| Configuration source priority? | Code (baked in by control plane) | Generated configs are type-safe |
| Package structure? | Mono-package initially | @c15t/destinations, split later if needed |
| Destination metadata? | Yes (name, description, icon, category) | Better UI/UX, easier discovery |
| Error handling? | onError, throwErrors, debug | Analytics should never break the app |
| Browser + Server integration? | Yes - in one destination | Universal destinations pattern |

## Competitive Advantages

### vs Segment
- ✅ GDPR compliance built-in (Segment: bolted on)
- ✅ Consent-based routing automatic (Segment: manual)
- ✅ Cookie banner integration (Segment: third-party)
- ✅ Type-safe destinations (Segment: string-based config)

### vs OneTrust
- ✅ Developer-friendly API (OneTrust: enterprise/complex)
- ✅ Works alongside OneTrust (OneTrust: all-or-nothing)
- ✅ Zero-downtime migration path (OneTrust: risky migration)
- ✅ Open source + self-hostable (OneTrust: proprietary SaaS)

### vs Other CMPs (Cookiebot, Osano, Termly)
- ✅ Unified analytics + consent (Others: separate systems)
- ✅ Developer SDK (Others: mostly UI-focused)
- ✅ Multi-CMP support (Others: single CMP)
- ✅ Custom destination extensibility (Others: fixed integrations)

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing analytics | Feature flag, run both systems in parallel |
| Type inference complexity | Extensive tests, fallback to simpler types if needed |
| Performance regression | Benchmark against event-sidekick, optimize hot paths |
| Migration complexity | Detailed guide, CLI helper tool |
| CMP integration issues | Start with OneTrust/Cookiebot, expand gradually |

## Next Actions

1. ✅ Review and approve this plan
2. Create feature branch: `feat/analytics-migration`
3. Install dependencies: `@standard-schema/spec`
4. Start Phase 1, Day 1: Create event types and plugin interface
5. Daily standup to review progress
6. Demo after each week

---

## Questions?

- **Technical details?** See [analytics-type-safe-api.md](./analytics-type-safe-api.md)
- **Implementation steps?** See [analytics-implementation-roadmap.md](./analytics-implementation-roadmap.md)
- **Package architecture?** See [analytics-package-architecture.md](./analytics-package-architecture.md)
- **Key improvements?** See [analytics-key-improvements.md](./analytics-key-improvements.md)
- **Full migration plan?** See [migration-plan-event-sidekick.md](./migration-plan-event-sidekick.md)

---

**Ready to start building? Let's ship this! 🚀**
