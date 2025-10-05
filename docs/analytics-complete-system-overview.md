# Complete Analytics System Overview

A visual guide to the complete c15t analytics system with all features integrated.

## System Architecture (Full Picture)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CONFIGURATION LAYER                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. Code-Based Config (Developer)                                        │
│     const instance = c15tInstance({                                      │
│       analytics: {                                                       │
│         destinations: [posthog({ apiKey: 'xxx' })]                      │
│       }                                                                   │
│     });                                                                   │
│                                                                           │
│  2. Database Config (Admin UI)                                           │
│     ┌─────────────────────────────────────┐                            │
│     │ destinations table                   │                            │
│     │ - organizationId, type, settings     │                            │
│     │ - enabled, environment, consent      │                            │
│     └─────────────────────────────────────┘                            │
│                                                                           │
│  3. Runtime Config (API/Feature Flags)                                   │
│     await destinationManager.addDestination(...)                         │
│                                                                           │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │ All configs merged
                              ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                         PROTOCOL LAYER                                    │
│                    (@c15t/backend - Protocol Only)                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ DestinationRegistry                                      │            │
│  │ - register(type, factory)                                │            │
│  │ - get(type) → factory                                    │            │
│  └─────────────────────────────────────────────────────────┘            │
│                              │                                            │
│                              ↓                                            │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ DestinationManager                                       │            │
│  │ - loadDestinations(configs) → Lazy load                 │            │
│  │ - processEvents(events, consent) → Filter & route       │            │
│  │ - generateClientScripts(consent) → Script configs       │            │
│  │ - addDestination(config) → Runtime registration         │            │
│  └─────────────────────────────────────────────────────────┘            │
│                              │                                            │
└──────────────────────────────┼────────────────────────────────────────────┘
                               │ Uses factories from
                               ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                      DESTINATIONS LAYER                                   │
│                 (@c15t/destinations - Implementations)                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Meta Pixel   │  │ Google       │  │ PostHog      │                  │
│  │              │  │ Analytics    │  │              │                  │
│  │ Server: ✓    │  │ Server: ✓    │  │ Server: ✓    │                  │
│  │ Client: ✓    │  │ Client: ✓    │  │ Client: ✗    │                  │
│  │              │  │              │  │              │                  │
│  │ Consent:     │  │ Consent:     │  │ Consent:     │                  │
│  │ marketing    │  │ measurement  │  │ measurement  │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Mixpanel     │  │ OneTrust     │  │ c15t         │                  │
│  │              │  │ (CMP)        │  │ Consent      │                  │
│  │ Server: ✓    │  │ Server: ✓    │  │ Server: ✓    │                  │
│  │ Client: ✗    │  │ Client: ✗    │  │ Client: ✗    │                  │
│  │              │  │              │  │              │                  │
│  │ Consent:     │  │ Consent:     │  │ Consent:     │                  │
│  │ measurement  │  │ necessary    │  │ necessary    │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                           │
│  Auto-registered on import | Versioned independently | Updated frequently│
└──────────────────────────────┬────────────────────────────────────────────┘
                               │ Events & Scripts
                               ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                         PROCESSING LAYER                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Request arrives with: { events: [...], consent: {...} }                │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ 1. Event Processor                                       │            │
│  │    - Validate events (Standard Schema)                   │            │
│  │    - Enrich events (add context)                         │            │
│  │    - Filter events (global filter)                       │            │
│  └─────────────────────────────────────────────────────────┘            │
│                              │                                            │
│                              ↓                                            │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ 2. Consent Filtering (Per Destination)                  │            │
│  │    - Check destination.requiredConsent                   │            │
│  │    - Filter events by consent purposes                   │            │
│  │    - Log filtered events for audit                       │            │
│  └─────────────────────────────────────────────────────────┘            │
│                              │                                            │
│                              ↓                                            │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ 3. Routing (Parallel)                                    │            │
│  │    - Route to all consented destinations                 │            │
│  │    - Isolate errors per destination                      │            │
│  │    - Retry on failures                                   │            │
│  └─────────────────────────────────────────────────────────┘            │
│                              │                                            │
│                              ↓                                            │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ 4. Special Handling: Consent Events                      │            │
│  │    If event.type === 'consent':                          │            │
│  │    - Send to all destinations                            │            │
│  │    - Call POST /consent/set (compliance DB)              │            │
│  │    - Update consent state                                │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                           │
└──────────────────────────────┬────────────────────────────────────────────┘
                               │
                               ↓ Events flow to destinations
                               │
     ┌─────────────────────────┼─────────────────────────┐
     │                         │                         │
     ↓                         ↓                         ↓
┌─────────┐              ┌─────────┐              ┌─────────┐
│ Meta    │              │ Google  │              │ PostHog │
│ Pixel   │              │ Analytics│              │         │
│         │              │         │              │         │
│ Server: │              │ Server: │              │ Server: │
│ Conv API│              │ Meas    │              │ Capture │
│         │              │ Protocol│              │ API     │
│         │              │         │              │         │
│ Client: │              │ Client: │              │ Client: │
│ Pixel   │              │ gtag.js │              │ (none)  │
│ Script  │              │ scripts │              │         │
└─────────┘              └─────────┘              └─────────┘
```

## Configuration Sources (Hierarchical)

```
┌────────────────────────────────────────────────────┐
│ Priority 1: CODE-BASED CONFIG                      │
│ (Developer-controlled, committed to git)            │
├────────────────────────────────────────────────────┤
│ const instance = c15tInstance({                    │
│   analytics: {                                     │
│     destinations: [                                │
│       posthog({ apiKey: 'xxx' })                  │
│     ]                                              │
│   }                                                │
│ });                                                │
└────────────────────────────────────────────────────┘
                        ↓ Merged with
┌────────────────────────────────────────────────────┐
│ Priority 2: DATABASE CONFIG                        │
│ (Admin-managed, stored in DB)                      │
├────────────────────────────────────────────────────┤
│ destinations table:                                │
│ ├─ meta-pixel (enabled, org-1, production)        │
│ ├─ google-analytics (enabled, org-1, production)  │
│ └─ mixpanel (disabled, org-1, staging)            │
└────────────────────────────────────────────────────┘
                        ↓ Merged with
┌────────────────────────────────────────────────────┐
│ Priority 3: RUNTIME CONFIG                         │
│ (Dynamically added via API)                        │
├────────────────────────────────────────────────────┤
│ await destinationManager.addDestination(           │
│   amplitude({ apiKey: 'zzz' })                    │
│ );                                                 │
└────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────┐
│ ACTIVE DESTINATIONS                                │
│ All configs merged and loaded                      │
└────────────────────────────────────────────────────┘
```

## Complete Feature Matrix

| Feature | Code Config | Database Config | Runtime Config |
|---------|-------------|-----------------|----------------|
| **Type Safety** | ✅ Full | ✅ Validated | ✅ Validated |
| **Version Control** | ✅ Git | ❌ No | ❌ No |
| **No-Code** | ❌ No | ✅ Yes | ⚠️ API |
| **Multi-Tenant** | ⚠️ Manual | ✅ Built-in | ✅ Built-in |
| **Hot-Reload** | ❌ Restart | ✅ Immediate | ✅ Immediate |
| **Audit Trail** | ⚠️ Git | ✅ Database | ⚠️ Logs |
| **Self-Service** | ❌ No | ✅ Yes | ⚠️ API |
| **Feature Flags** | ⚠️ Manual | ✅ Easy | ✅ Easy |
| **A/B Testing** | ⚠️ Manual | ✅ Easy | ✅ Easy |

## Use Cases by Configuration Method

### Code-Based (Best For)
- ✅ Core analytics (PostHog, Mixpanel) that never change
- ✅ Development environment defaults
- ✅ Open-source self-hosted deployments
- ✅ Simple single-tenant apps

### Database-Based (Best For)
- ✅ Multi-tenant SaaS platforms
- ✅ Customer-configurable integrations
- ✅ Marketing team-managed destinations
- ✅ Environment-specific configs
- ✅ Enterprise deployments with admin UI

### Runtime-Based (Best For)
- ✅ Feature flags and experiments
- ✅ A/B testing destinations
- ✅ Temporary integrations
- ✅ Debug/troubleshooting
- ✅ Dynamic tenant onboarding

## Configuration Patterns

### Pattern 1: Code-Only (Simple Apps)
```typescript
const instance = c15tInstance({
	analytics: {
		destinations: [
			posthog({ apiKey: 'xxx' }),
			googleAnalytics({ measurementId: 'G-XXX' }),
		]
	}
});
```

**Best for**: Startups, simple apps, open-source deployments

### Pattern 2: Hybrid (Common)
```typescript
const instance = c15tInstance({
	analytics: {
		// Core analytics in code (stable)
		destinations: [
			posthog({ apiKey: 'xxx' }),
		],
		// Marketing tools in database (dynamic)
		loadFromDatabase: true,
	}
});
```

**Best for**: Growing startups, product-driven teams

### Pattern 3: Database-First (Multi-Tenant SaaS)
```typescript
const instance = c15tInstance({
	analytics: {
		// Everything from database
		loadFromDatabase: true,
		organizationId: currentOrg.id,
	}
});
```

**Best for**: Multi-tenant SaaS, enterprise platforms, self-service

### Pattern 4: Fully Dynamic (Advanced)
```typescript
const instance = c15tInstance({
	analytics: {
		// Base from code
		destinations: [console({ logLevel: 'debug' })],
		// Add from database
		loadFromDatabase: true,
		// Allow runtime changes
		enableRuntimeRegistration: true,
	}
});

// Add destinations based on feature flags
if (featureFlags.enableAmplitude) {
	await destinationManager.addDestination(
		amplitude({ apiKey: env.AMPLITUDE_KEY })
	);
}
```

**Best for**: Large platforms, A/B testing, experimentation

## Complete Developer Flow

```
┌─────────────────────────────────────────────────────┐
│ DEVELOPER CONFIGURES (Code or UI)                   │
└─────────────────┬───────────────────────────────────┘
                  │
                  ↓ Three ways to configure
                  │
    ┌─────────────┼─────────────────┐
    │             │                 │
    ↓             ↓                 ↓
┌────────┐  ┌──────────┐  ┌────────────┐
│ Code   │  │ Database │  │ Runtime    │
│ Config │  │ (Admin   │  │ (API/      │
│        │  │ UI)      │  │ Flags)     │
└───┬────┘  └────┬─────┘  └──────┬─────┘
    │            │                │
    └────────────┼────────────────┘
                 │ All merged
                 ↓
┌─────────────────────────────────────────────────────┐
│ BACKEND LOADS DESTINATIONS                          │
│ - Validates with Standard Schema                    │
│ - Lazy loads on first use                           │
│ - Generates client scripts                          │
└─────────────────┬───────────────────────────────────┘
                  │
                  ↓ Provides
                  │
    ┌─────────────┼─────────────────┐
    │             │                 │
    ↓             ↓                 ↓
┌────────┐  ┌──────────┐  ┌────────────┐
│ Server │  │ Client   │  │ Consent    │
│ Events │  │ Scripts  │  │ Routing    │
└────────┘  └──────────┘  └────────────┘
    │             │                 │
    │             │                 │
    ↓             ↓                 ↓
┌─────────────────────────────────────────────────────┐
│ USER RECEIVES                                        │
│ - Server-side tracking (accurate)                   │
│ - Client-side scripts (client-side events)          │
│ - GDPR-compliant routing (automatic)                │
└─────────────────────────────────────────────────────┘
```

## Multi-Tenant Example

```
┌──────────────────────────────────────────────────────────┐
│ CUSTOMER A (E-commerce)                                   │
│ organizationId: org-ecommerce                            │
├──────────────────────────────────────────────────────────┤
│ Configured Destinations (via Admin UI):                  │
│ ├─ Meta Pixel (pixelId: 1111111111)                     │
│ ├─ Google Analytics (measurementId: G-AAA)              │
│ ├─ TikTok Pixel (pixelId: AAAA)                         │
│ └─ c15t Consent (apiKey: cst_xxx)                       │
│                                                           │
│ Events from customer A's website:                        │
│ → Routed to customer A's destinations only               │
│ → Scripts generated with customer A's IDs                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ CUSTOMER B (SaaS)                                         │
│ organizationId: org-saas                                 │
├──────────────────────────────────────────────────────────┤
│ Configured Destinations (via Admin UI):                  │
│ ├─ Mixpanel (projectToken: abc123)                      │
│ ├─ Amplitude (apiKey: xyz789)                           │
│ ├─ PostHog (apiKey: phc_yyy)                            │
│ └─ c15t Consent (apiKey: cst_yyy)                       │
│                                                           │
│ Events from customer B's website:                        │
│ → Routed to customer B's destinations only               │
│ → Scripts generated with customer B's IDs                │
└──────────────────────────────────────────────────────────┘

Both using SAME c15t backend instance
Isolated by organizationId
```

## Self-Service Onboarding Flow

```
Step 1: Customer signs up for your SaaS
    ↓
Step 2: Onboarding wizard: "Connect your analytics tools"
    ├─ UI shows: Meta Pixel, Google Analytics, Mixpanel, etc.
    └─ Customer clicks "Connect Meta Pixel"
    ↓
Step 3: Form: Enter your Meta Pixel ID and Access Token
    ├─ Customer enters: pixelId: 9999999999
    ├─ Customer enters: accessToken: EAAzzz
    └─ Click "Test Connection"
    ↓
Step 4: Backend validates credentials
    ├─ Creates temp Meta Pixel destination
    ├─ Calls testConnection()
    └─ Returns ✅ Success or ❌ Error
    ↓
Step 5: Save to database
    ├─ INSERT INTO destinations (organizationId, type, settings, ...)
    ├─ Encrypt access token
    └─ Hot-reload destination
    ↓
Step 6: Customer's events immediately flow
    ├─ Server-side: Events to their Conversions API
    ├─ Client-side: Their pixel script loaded
    └─ All isolated from other customers
    ↓
Step 7: Customer sees real-time analytics
    ✅ No developer needed
    ✅ No code deployment
    ✅ Instant gratification
```

## Security & Isolation

```
┌────────────────────────────────────────────────────┐
│ SECURITY LAYERS                                     │
├────────────────────────────────────────────────────┤
│                                                     │
│ 1. Row-Level Security (RLS)                        │
│    Users only see their org's destinations         │
│                                                     │
│ 2. Settings Encryption                             │
│    API keys encrypted at rest in database          │
│                                                     │
│ 3. Runtime Validation                              │
│    Standard Schema validates all settings          │
│                                                     │
│ 4. Organization Isolation                          │
│    Events never cross organization boundaries      │
│                                                     │
│ 5. Permission Checks                               │
│    Role-based access to admin API                  │
│                                                     │
│ 6. Audit Logging                                   │
│    All changes tracked (who, what, when)           │
│                                                     │
└────────────────────────────────────────────────────┘
```

## Key Advantages

| Capability | Traditional | c15t with Cloud Config |
|------------|-------------|------------------------|
| **Add destination** | Code deploy (hours/days) | Admin UI (seconds) |
| **Multi-tenant** | Complex custom code | Built-in organization scoping |
| **Self-service** | Not possible | Full customer control |
| **A/B testing** | Feature flags in code | Toggle in UI |
| **Type safety** | Only for code config | All configs validated |
| **Security** | Env vars | Encrypted database |
| **Audit trail** | Git commits only | Full audit log |
| **Hot-reload** | Restart required | Instant |

## Extended Timeline

### Original: 12 days (code-only)
- Week 1: Core infrastructure
- Week 2: Destinations
- Week 3: Integration & testing

### Extended: 20 days (with cloud config)
- Week 1: Core infrastructure
- Week 2: Destinations
- Week 3: Scripts integration
- **Week 4: Cloud configuration**
  - Day 13-14: Database schema & migrations
  - Day 15-16: Admin API (CRUD endpoints)
  - Day 17-18: Admin UI components
  - Day 19: Dynamic loading & hot-reload
  - Day 20: Testing & polish

## Summary

**Question**: "Is there a way we could feed the scripts from the server to the front end so they could be configured in the cloud as well not just as code?"

**Answer**: **Absolutely!** This enables:

✅ **No-Code Management**: Configure destinations via admin UI
✅ **Multi-Tenant SaaS**: Each customer has their own destinations
✅ **Self-Service**: Customers connect their own tools
✅ **Dynamic Scripts**: Scripts generated from database configs
✅ **Hot-Reload**: Changes apply instantly without restart
✅ **Type Safety**: Still validated with Standard Schema
✅ **Security**: Settings encrypted, organization-isolated
✅ **Flexibility**: Mix code, database, and runtime configs

**This transforms c15t from a developer tool into a full SaaS platform.**

---

See [analytics-cloud-configuration.md](./analytics-cloud-configuration.md) for complete implementation details!
