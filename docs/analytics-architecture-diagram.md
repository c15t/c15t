# Analytics System Architecture Diagram

## Complete System Flow

```
┌────────────────────────────────────────────────────────────────┐
│  FRONTEND (c15t, @c15t/react)                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Action → analytics.track('Event', props)                 │
│  User Action → analytics.page('Page Name')                     │
│  Cookie Banner → analytics.consent({ preferences: {...} })     │
│                                                                 │
│  ┌──────────────────────────────────────────┐                 │
│  │  Event Queue (client-side)                │                 │
│  │  - Batches events                         │                 │
│  │  - Includes consent state                 │                 │
│  │  - Retries on failure                     │                 │
│  └──────────────────┬───────────────────────┘                 │
│                     │                                           │
└─────────────────────┼───────────────────────────────────────────┘
                      │ POST /analytics/process
                      │ { events: [...], consent: {...} }
                      ↓
┌────────────────────────────────────────────────────────────────┐
│  BACKEND (@c15t/backend/v2)                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────┐                 │
│  │  Analytics Handler                        │                 │
│  │  - Validates event batch                  │                 │
│  │  - Extracts consent                       │                 │
│  └──────────────────┬───────────────────────┘                 │
│                     │                                           │
│                     ↓                                           │
│  ┌──────────────────────────────────────────┐                 │
│  │  Event Processor                          │                 │
│  │  1. Validate events (Standard Schema)     │                 │
│  │  2. Enrich events (add context)           │                 │
│  │  3. Filter events (global filter)         │                 │
│  │  4. Route to destinations                 │                 │
│  └──────────────────┬───────────────────────┘                 │
│                     │                                           │
│                     ↓                                           │
│  ┌──────────────────────────────────────────┐                 │
│  │  Destination Manager                      │                 │
│  │  - Lazy loads destinations                │                 │
│  │  - Filters by consent per destination     │                 │
│  │  - Calls consent handler for consent events│                 │
│  │  - Handles errors per destination         │                 │
│  └──────────────────┬───────────────────────┘                 │
│                     │                                           │
│                     ↓                                           │
│  ┌──────────────────────────────────────────┐                 │
│  │  Consent Event Special Handling           │                 │
│  │  If event.type === 'consent':             │                 │
│  │  1. Send to all destinations              │                 │
│  │  2. Call POST /consent/set                │                 │
│  │     (existing consent management)         │                 │
│  └──────────────────┬───────────────────────┘                 │
│                     │                                           │
└─────────────────────┼───────────────────────────────────────────┘
                      │
                      ↓ Routes to multiple destinations in parallel
                      │
     ┌────────────────┼────────────────┐
     │                │                │
     ↓                ↓                ↓
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│PostHog  │    │Mixpanel │    │c15t     │    │OneTrust │
│         │    │         │    │Consent  │    │(CMP)    │
│Requires │    │Requires │    │Requires │    │Requires │
│measure  │    │measure  │    │necessary│    │necessary│
└─────────┘    └─────────┘    └─────────┘    └─────────┘

ALL DESTINATIONS from @c15t/destinations package
(versioned independently, can be updated anytime)
```

## Consent-Based Filtering Example

```
User Consent: { necessary: ✓, measurement: ✗, marketing: ✓ }

Event: track('Product Viewed')
  ├─ Check: PostHog requires 'measurement'
  │   └─ Result: ❌ BLOCKED (consent not granted)
  │
  ├─ Check: Meta Pixel requires 'marketing'
  │   └─ Result: ✅ SENT (consent granted)
  │
  ├─ Check: Google Analytics requires 'measurement'
  │   └─ Result: ❌ BLOCKED (consent not granted)
  │
  └─ Check: Console requires 'necessary'
      └─ Result: ✅ SENT (always granted)

Event: consent({ action: 'updated', preferences: {...} })
  ├─ Check: PostHog requires 'measurement'
  │   └─ Result: ✅ SENT (consent events always sent)
  │
  ├─ Check: c15t Consent requires 'necessary'
  │   └─ Result: ✅ SENT (consent events always sent)
  │
  └─ Check: OneTrust requires 'necessary'
      └─ Result: ✅ SENT (syncs back to OneTrust platform)
```

## Package Dependency Flow

```
┌──────────────────────────────────────────────┐
│  @c15t/backend@2.0.0                         │
│  Exports:                                     │
│  - DestinationPlugin interface               │
│  - DestinationConfig<T> type                 │
│  - DestinationFactory<T> type                │
│  - createDestinationConfig<T>() helper       │
│  - destinationRegistry (global)              │
│  - DestinationManager (orchestrator)         │
│                                               │
│  Updates: Quarterly (protocol changes only)  │
└──────────────────┬───────────────────────────┘
                   │ peerDependency
                   ↓
┌──────────────────────────────────────────────┐
│  @c15t/destinations@1.5.3                    │
│  Imports from @c15t/backend:                 │
│  - DestinationPlugin (implements)            │
│  - DestinationFactory (uses)                 │
│  - destinationRegistry (registers with)      │
│  - createDestinationConfig (uses)            │
│                                               │
│  Exports:                                     │
│  - posthog(settings) → DestinationConfig     │
│  - mixpanel(settings) → DestinationConfig    │
│  - googleAnalytics(settings) → Config        │
│  - onetrust(settings) → DestinationConfig    │
│  - console(settings) → DestinationConfig     │
│                                               │
│  Updates: Weekly (destination changes)       │
└──────────────────┬───────────────────────────┘
                   │
                   ↓ both dependencies
┌──────────────────────────────────────────────┐
│  User's Application                          │
│                                               │
│  import { c15tInstance }                     │
│    from '@c15t/backend/v2'                   │
│  import { posthog, mixpanel }                │
│    from '@c15t/destinations'                 │
│                                               │
│  const instance = c15tInstance({             │
│    analytics: {                              │
│      destinations: [                         │
│        posthog({ apiKey: 'xxx' }),           │
│        mixpanel({ token: 'yyy' })            │
│      ]                                        │
│    }                                          │
│  });                                          │
└──────────────────────────────────────────────┘
```

## Lazy Loading Flow

```
Application Starts
    ↓
c15tInstance created
    ↓
DestinationManager initialized
    ↓
Destinations in config: ['posthog', 'mixpanel']
    ↓
Factories registered in global registry
    ↓
⏸️  NO destinations loaded yet (lazy loading)
    ↓
    ↓ Time passes...
    ↓
First event arrives: analytics.track('Button Clicked')
    ↓
DestinationManager.processEvents called
    ↓
    ├─→ lazyLoadDestination('posthog', settings)
    │   ├─ Check if loaded: No
    │   ├─ Get factory from registry: ✓
    │   ├─ Create PostHogDestination instance
    │   ├─ Call initialize(settings)
    │   └─ Cache in destinations map
    │
    └─→ lazyLoadDestination('mixpanel', settings)
        ├─ Check if loaded: No
        ├─ Get factory from registry: ✓
        ├─ Create MixpanelDestination instance
        ├─ Call initialize(settings)
        └─ Cache in destinations map
    ↓
Destinations loaded! (cached for future events)
    ↓
Filter events by consent
    ↓
Send to destinations
    ↓
    ├─→ PostHog.track(event, context)
    └─→ Mixpanel.track(event, context)
    ↓
Next event is instant (destinations already loaded)
```

## Runtime Registration Flow

```
Application Running
    ↓
Feature flag enabled: enableAmplitude = true
    ↓
Programmatically add destination:
    ↓
destinationManager.registerDestination(
    'amplitude',
    amplitudeFactory
)
    ↓
Registry updated with new factory
    ↓
destinationManager.addDestination(
    amplitude({ apiKey: 'xxx' })
)
    ↓
Destination lazy loaded
    ↓
Future events now go to Amplitude too!
    ↓
Later... feature flag disabled
    ↓
destinationManager.removeDestination('amplitude')
    ↓
Destination.destroy() called (cleanup)
    ↓
Amplitude removed from active destinations
```

## Enterprise Migration Scenario

```
MONTH 1: Dual-Write Setup
┌────────────────────────────────────────┐
│  Frontend: Cookie Banner               │
│  ↓                                      │
│  analytics.consent({ ... })            │
└──────────┬─────────────────────────────┘
           │ Consent event
           ↓
┌────────────────────────────────────────┐
│  Backend: Destination Manager          │
│  ↓                                      │
│  Routes to ALL destinations:           │
│  ├─→ c15t Consent (NEW)    ✓          │
│  ├─→ OneTrust (LEGACY)     ✓          │
│  └─→ PostHog (Analytics)   ✓          │
└────────────────────────────────────────┘

Status: Data going to both c15t + OneTrust
Result: Validate data parity, build confidence


MONTH 2-4: Parallel Operation
┌────────────────────────────────────────┐
│  Teams use BOTH platforms:             │
│  - Compliance reports: OneTrust        │
│  - New features: c15t                  │
│  - Compare data regularly              │
└────────────────────────────────────────┘

Status: OneTrust = trusted, c15t = validated
Result: Ready to cut over


MONTH 5: Migration Complete
┌────────────────────────────────────────┐
│  Config Change:                         │
│  destinations: [                        │
│    consent({ ... }),                    │
│    posthog({ ... }),                    │
│    // onetrust({ ... }),  ← REMOVED   │
│  ]                                      │
└────────────────────────────────────────┘

Status: OneTrust license cancelled
Result: $50k-200k/year savings
        Full control
        Single platform
```

## Type Safety Flow

```
Developer writes:
  const config = posthog({
    apiKey: 'xxx',
    wrongField: 'yyy'  ← TypeScript error!
  });

How it works:
  1. posthog() function has typed signature
  2. PostHogSettings = { apiKey: string; host?: string }
  3. TypeScript checks object literal
  4. Error: "wrongField does not exist in type PostHogSettings"

Developer writes:
  const config = myCustom({
    apiKey: 'xxx',
    endpoint: 'https://api.com',
    retries: 3
  });

How it works:
  1. myCustom<TSettings>() is generic
  2. TypeScript infers TSettings = {
       apiKey: string;
       endpoint: string;
       retries: number;
     }
  3. Returns DestinationConfig<TSettings>
  4. Full type safety with zero type annotations!
```

## Standard Schema Validation Flow

```
Destination initialization:
  const destination = await factory(settings);
  await destination.initialize(settings);

Inside initialize():
  1. Get settingsSchema (StandardSchemaV1)
  2. Call schema validation (works with any validator!)
     
     // If Zod:
     const result = this.settingsSchema.parse(settings);
     
     // If ArkType:
     const result = this.settingsSchema(settings);
     
     // If Valibot:
     const result = v.parse(this.settingsSchema, settings);
  
  3. Throw if invalid, continue if valid
  4. Settings are now validated!

Standard Schema benefits:
  ✅ One interface, any validator
  ✅ Type inference works
  ✅ Runtime validation guaranteed
  ✅ Developer choice
```

## Real-World Consent Scenario

```
┌─────────────────────────────────────────────────────────────────┐
│  User Journey: From Landing to Purchase                         │
└─────────────────────────────────────────────────────────────────┘

1. User lands on site (10:00 AM)
   Consent: { necessary: ✓, measurement: ✗, marketing: ✗ }
   Event: page('Homepage')
   
   Routing:
   ├─ Console (necessary)     → ✅ Sent
   ├─ PostHog (measurement)   → ❌ Blocked
   └─ Meta Pixel (marketing)  → ❌ Blocked

2. User clicks "Accept Analytics" (10:01 AM)
   Event: consent({ action: 'updated', preferences: { measurement: ✓ } })
   Updated Consent: { necessary: ✓, measurement: ✓, marketing: ✗ }
   
   Routing:
   ├─ Console → ✅ Consent event sent
   ├─ PostHog → ✅ Consent event sent
   ├─ c15t Consent DB → ✅ Record created
   └─ Meta Pixel → ❌ Blocked (needs marketing)

3. User browses products (10:02 AM)
   Consent: { necessary: ✓, measurement: ✓, marketing: ✗ }
   Event: track('Product Viewed', { productId: '123' })
   
   Routing:
   ├─ Console → ✅ Sent
   ├─ PostHog → ✅ NOW SENT (measurement granted)
   └─ Meta Pixel → ❌ Still blocked

4. User clicks "Accept Marketing" (10:05 AM)
   Event: consent({ action: 'updated', preferences: { marketing: ✓ } })
   Updated Consent: { necessary: ✓, measurement: ✓, marketing: ✓ }
   
   Routing:
   ├─ Console → ✅ Consent event sent
   ├─ PostHog → ✅ Consent event sent
   ├─ c15t Consent DB → ✅ Record updated
   └─ Meta Pixel → ✅ NOW RECEIVES consent event

5. User adds to cart (10:06 AM)
   Consent: { necessary: ✓, measurement: ✓, marketing: ✓ }
   Event: track('Product Added', { productId: '123' })
   
   Routing:
   ├─ Console → ✅ Sent
   ├─ PostHog → ✅ Sent
   └─ Meta Pixel → ✅ NOW SENT (marketing granted)

6. User revokes marketing (10:10 AM)
   Event: consent({ action: 'revoked', preferences: { marketing: ✗ } })
   Updated Consent: { necessary: ✓, measurement: ✓, marketing: ✗ }
   
   Routing:
   ├─ Console → ✅ Consent event sent
   ├─ PostHog → ✅ Consent event sent
   ├─ c15t Consent DB → ✅ Record updated
   └─ Meta Pixel → ✅ Receives revocation (stops tracking)

7. User completes purchase (10:15 AM)
   Consent: { necessary: ✓, measurement: ✓, marketing: ✗ }
   Event: track('Purchase Complete', { total: 99.99 })
   
   Routing:
   ├─ Console → ✅ Sent
   ├─ PostHog → ✅ Sent
   └─ Meta Pixel → ❌ BLOCKED AGAIN (marketing revoked)
```

**Key Insight**: Consent is checked **on every event**, not just once. Users can change their mind at any time, and the system instantly respects their choice.

## CMP Integration Patterns

### Pattern 1: c15t Only (New Customers)
```
User → Cookie Banner → c15t
                      ↓
            [c15t Consent destination]
                      ↓
              c15t Database
```

### Pattern 2: Dual-CMP (Enterprise Migration)
```
User → Cookie Banner → c15t
                      ↓
            ┌─────────┴─────────┐
            ↓                   ↓
   [c15t Consent]      [OneTrust destination]
            ↓                   ↓
   c15t Database       OneTrust Platform

Both platforms receive same data
Can compare for validation
Zero-risk migration
```

### Pattern 3: Custom CMP (Future)
```
User → Custom Banner → c15t
                      ↓
          [Custom CMP destination]
                      ↓
         Third-party Platform

Any CMP can create a destination plugin
No changes needed to c15t core
Extensible architecture
```

## Why This Architecture Wins

| Feature | Segment | OneTrust | Other CMPs | c15t |
|---------|---------|----------|------------|------|
| **Analytics + Consent** | Analytics only | Consent only | Consent only | ✅ Both |
| **GDPR Built-in** | ❌ Manual | ✅ Yes | ✅ Yes | ✅ Yes |
| **Multi-CMP Support** | N/A | ❌ No | ❌ No | ✅ Yes |
| **Custom Destinations** | ⚠️ Complex | ❌ No | ❌ No | ✅ Easy |
| **Type Safety** | ⚠️ Partial | ❌ No | ❌ No | ✅ Full |
| **Runtime Validation** | ❌ No | ⚠️ Limited | ⚠️ Limited | ✅ Yes |
| **Lazy Loading** | ❌ No | N/A | N/A | ✅ Yes |
| **Self-Hostable** | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Open Source** | ⚠️ SDKs only | ❌ No | ❌ No | ✅ Full |

## Technical Advantages

### For Developers
- ✅ 100% type-safe configurations
- ✅ Use any validator (Zod, ArkType, Valibot)
- ✅ Add custom destinations in < 100 lines
- ✅ Runtime destination management
- ✅ Automatic GDPR compliance
- ✅ No manual consent checking

### For Operations
- ✅ Independent package versioning
- ✅ Fast destination updates (no backend release)
- ✅ Lazy loading (faster startup)
- ✅ Feature flag support
- ✅ A/B testing capabilities
- ✅ Environment-specific configs

### For Compliance
- ✅ Consent events automatically recorded
- ✅ Audit trail in database
- ✅ Automatic event filtering by consent
- ✅ Multi-CMP validation
- ✅ GDPR requirements enforced by code

### For Business
- ✅ **Enterprise sales enabler** (dual-CMP support)
- ✅ **Lower friction** (work alongside existing tools)
- ✅ **Land & expand** (migrate customers over time)
- ✅ **Competitive moat** (OneTrust can't match this)
- ✅ **Faster deals** (no rip-and-replace)

---

**This architecture isn't just technically superior—it's a strategic business advantage.**
