# Destination Packages Strategy

## The Question

Should we ship destinations as:
- **Option A**: One package `@c15t/destinations` with all destinations
- **Option B**: Multiple packages `@c15t-destinations/posthog`, `@c15t-destinations/google-analytics`, etc.

## Executive Summary

**Start with Option A (mono-package), evolve to Option B (scoped packages) over time.**

**Phase 1** (Launch): `@c15t/destinations` with all destinations
**Phase 2** (Scale): Split into `@c15t-destinations/*` scoped packages
**Timeline**: 6-12 months between phases

## Detailed Analysis

### Option A: Mono-Package (`@c15t/destinations`)

```typescript
// One package with all destinations
npm install @c15t/destinations

// Import what you need
import { posthog, metaPixel, googleAnalytics, mixpanel } from '@c15t/destinations';
```

**Package structure:**
```
@c15t/destinations
├── src/
│   ├── posthog/
│   ├── meta-pixel/
│   ├── google-analytics/
│   ├── mixpanel/
│   ├── amplitude/
│   └── index.ts  (exports all)
├── dist/
│   ├── index.js  (bundled)
│   └── index.d.ts
└── package.json
```

#### Advantages

1. **Simpler Installation**
   ```bash
   npm install @c15t/destinations
   ```
   vs
   ```bash
   npm install @c15t-destinations/posthog @c15t-destinations/meta-pixel @c15t-destinations/google-analytics
   ```

2. **Easier Discovery**
   - One package to find
   - Browse all destinations in one place
   - Documentation in one location

3. **Simpler Versioning**
   - One version number for all destinations
   - Easier to ensure compatibility
   - Simpler dependency management

4. **Better Tree-Shaking**
   - Modern bundlers (Webpack 5, Vite, Turbopack) can tree-shake unused destinations
   - Only bundle what's imported
   - No penalty for having all destinations

5. **Easier to Maintain (Initially)**
   - One package.json
   - One build process
   - One test suite
   - One publish workflow

6. **Lower Barrier to Entry**
   - New users install one package
   - Get everything immediately
   - Can experiment with different destinations easily

#### Disadvantages

1. **Larger Bundle Size**
   - Full package is ~500KB-1MB (all destinations)
   - Users download dependencies for destinations they don't use
   - Slower npm install (initially)

2. **Coupling**
   - Breaking change in one destination affects all users
   - Must version all destinations together
   - Harder to have destination-specific major versions

3. **Contributor Friction**
   - Contributors must understand monorepo structure
   - More files to navigate
   - Longer PR review cycles (more in scope)

4. **Deployment Complexity**
   - Breaking change requires careful versioning
   - Can't version destinations independently
   - Hotfix for one destination requires full release

---

### Option B: Multi-Package (`@c15t-destinations/*`)

```typescript
// Individual packages per destination
npm install @c15t-destinations/posthog @c15t-destinations/meta-pixel

// Import from specific packages
import { posthog } from '@c15t-destinations/posthog';
import { metaPixel } from '@c15t-destinations/meta-pixel';
```

**Package structure:**
```
@c15t-destinations/posthog
├── src/
│   └── index.ts
├── dist/
└── package.json

@c15t-destinations/meta-pixel
├── src/
│   └── index.ts
├── dist/
└── package.json

@c15t-destinations/google-analytics
├── src/
│   └── index.ts
├── dist/
└── package.json
```

#### Advantages

1. **Optimal Bundle Size**
   - Install only what you use
   - Smaller node_modules
   - Faster npm install

2. **Independent Versioning**
   ```json
   @c15t-destinations/posthog: 2.1.0
   @c15t-destinations/meta-pixel: 1.5.3
   @c15t-destinations/google-analytics: 1.0.0
   ```
   - Breaking changes isolated
   - Hotfixes faster
   - Version at own pace

3. **Better for Scale**
   - 50+ destinations? No problem
   - Each has own repo (or monorepo subfolder)
   - Easier to contribute (smaller scope)

4. **Clearer Ownership**
   - Each package has CODEOWNERS
   - Destination maintainers clear
   - Easier to delegate

5. **Better for Community**
   - Easier to contribute one destination
   - Can publish community destinations
   - Lower barrier to add new integrations

6. **Semantic Versioning Per Destination**
   - PostHog adds feature → minor bump
   - Meta Pixel fix bug → patch bump
   - GA has breaking change → major bump (doesn't affect others)

#### Disadvantages

1. **Installation Complexity**
   ```bash
   # Install 5 destinations = 5 npm commands
   npm install @c15t-destinations/posthog
   npm install @c15t-destinations/meta-pixel
   npm install @c15t-destinations/google-analytics
   npm install @c15t-destinations/mixpanel
   npm install @c15t-destinations/amplitude
   ```

2. **Discovery Harder**
   - Need to know package names
   - Can't browse all in one place
   - Documentation spread across packages

3. **Versioning Complexity**
   - Must manage compatibility matrix
   - "Which version of posthog works with backend v2.1?"
   - More complex dependency trees

4. **More Maintenance Overhead**
   - 50 packages = 50 package.json files
   - 50 build processes
   - 50 publish workflows
   - 50 changelogs

5. **Import Complexity**
   ```typescript
   // More verbose imports
   import { posthog } from '@c15t-destinations/posthog';
   import { metaPixel } from '@c15t-destinations/meta-pixel';
   import { googleAnalytics } from '@c15t-destinations/google-analytics';
   
   vs
   
   import { posthog, metaPixel, googleAnalytics } from '@c15t/destinations';
   ```

---

## Recommended Strategy: Hybrid Approach

### Phase 1: Launch with Mono-Package (Months 1-12)

**Start simple:**
```
npm install @c15t/destinations
```

**Benefits:**
- ✅ Faster to ship (one package)
- ✅ Easier for early adopters (simple install)
- ✅ Learn what destinations are popular
- ✅ Build community before splitting

**When to do this**: ✅ **NOW** (initial launch)

---

### Phase 2: Monitor & Prepare (Months 6-12)

**Gather data:**
- Which destinations are most used?
- Which destinations change frequently?
- What's the average install size impact?
- Community feedback on package size

**Prepare for split:**
- Ensure each destination is self-contained
- Document per-destination APIs
- Set up multi-package CI/CD

**When to do this**: After 500+ users, 10+ destinations

---

### Phase 3: Split to Scoped Packages (Months 12+)

**Gradually split:**

```
@c15t/destinations (meta-package)
├── Depends on all @c15t-destinations/*
└── Re-exports for backwards compatibility

@c15t-destinations/posthog
@c15t-destinations/meta-pixel
@c15t-destinations/google-analytics
... (each separate)
```

**Migration path:**
```typescript
// Old way (still works!)
import { posthog } from '@c15t/destinations';

// New way (smaller bundle)
import { posthog } from '@c15t-destinations/posthog';
```

**When to do this**: When bundle size complaints or 20+ destinations

---

## Package Structure Recommendation

### Phase 1: Mono-Package Structure

```
packages/destinations/
├── src/
│   ├── index.ts                    # Exports all destinations
│   ├── types.ts                    # Shared types
│   ├── utils.ts                    # Shared utilities
│   │
│   ├── posthog/
│   │   ├── index.ts                # PostHog destination
│   │   ├── types.ts                # PostHog-specific types
│   │   ├── client.ts               # PostHog API client
│   │   └── __tests__/
│   │
│   ├── meta-pixel/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── conversions-api.ts      # Server-side
│   │   ├── pixel-script.ts         # Client-side
│   │   └── __tests__/
│   │
│   ├── google-analytics/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── measurement-protocol.ts # Server-side
│   │   ├── gtag-script.ts          # Client-side
│   │   └── __tests__/
│   │
│   └── ... (more destinations)
│
├── dist/
│   ├── index.js                    # Bundled output
│   ├── index.d.ts                  # Types
│   └── index.mjs                   # ESM
│
├── package.json
├── tsconfig.json
└── README.md
```

**Key principle**: Each destination in its own folder, self-contained.

**Export pattern:**
```typescript
// src/index.ts

// Auto-register with global registry
import { destinationRegistry } from '@c15t/backend/v2/analytics';

// Import all destinations
import { posthogDestination } from './posthog';
import { metaPixelDestination } from './meta-pixel';
import { googleAnalyticsDestination } from './google-analytics';

// Register all
destinationRegistry.register('posthog', posthogDestination);
destinationRegistry.register('meta-pixel', metaPixelDestination);
destinationRegistry.register('google-analytics', googleAnalyticsDestination);

// Export builders
export { posthog } from './posthog';
export { metaPixel } from './meta-pixel';
export { googleAnalytics } from './google-analytics';

// Export types
export type { PostHogSettings } from './posthog';
export type { MetaPixelSettings } from './meta-pixel';
export type { GoogleAnalyticsSettings } from './google-analytics';
```

---

### Phase 3: Multi-Package Structure

```
packages/destinations-meta/
└── package.json  (name: "@c15t/destinations")
    └── dependencies: all @c15t-destinations/*

packages/destinations-posthog/
├── src/
│   └── index.ts
├── package.json  (name: "@c15t-destinations/posthog")
└── README.md

packages/destinations-meta-pixel/
├── src/
│   └── index.ts
├── package.json  (name: "@c15t-destinations/meta-pixel")
└── README.md

packages/destinations-google-analytics/
├── src/
│   └── index.ts
├── package.json  (name: "@c15t-destinations/google-analytics")
└── README.md
```

**Migration compatibility:**
```typescript
// @c15t/destinations/package.json (meta-package)
{
  "name": "@c15t/destinations",
  "version": "2.0.0",
  "dependencies": {
    "@c15t-destinations/posthog": "^1.0.0",
    "@c15t-destinations/meta-pixel": "^1.0.0",
    "@c15t-destinations/google-analytics": "^1.0.0"
  },
  "exports": {
    "./posthog": "@c15t-destinations/posthog",
    "./meta-pixel": "@c15t-destinations/meta-pixel",
    "./google-analytics": "@c15t-destinations/google-analytics"
  }
}

// Still works!
import { posthog } from '@c15t/destinations';
// Actually resolves to @c15t-destinations/posthog
```

---

## Bundle Size Analysis

### Scenario: Customer uses only PostHog

**Option A (Mono-Package):**
```
@c15t/destinations: 800KB (includes all destinations)
└── PostHog: 50KB (what they use)
    Overhead: 750KB (unused destinations)

With tree-shaking: 100-150KB (bundler removes unused)
```

**Option B (Multi-Package):**
```
@c15t-destinations/posthog: 50KB
└── PostHog: 50KB
    Overhead: 0KB

Final size: 50KB
```

**Difference**: 
- Without tree-shaking: 750KB savings
- With tree-shaking: 50-100KB savings
- **Impact**: Minimal with modern bundlers

---

## Community & Ecosystem

### Option A: Mono-Package

**Community destinations:**
```
// Official destinations
@c15t/destinations (PostHog, Meta Pixel, GA, etc.)

// Community destinations
@acme/c15t-destinations (Custom destinations)
@community/c15t-salesforce-destination
```

**Discovery**: Search npm for "c15t-destination"

**Governance**: 
- Core team maintains official destinations
- Community maintains their own packages
- Clear separation of official vs community

---

### Option B: Multi-Package

**Community destinations:**
```
// Official destinations (scoped)
@c15t-destinations/posthog
@c15t-destinations/meta-pixel

// Community destinations (same pattern!)
@community-destinations/salesforce
@acme-destinations/custom
```

**Discovery**: Browse npm scope `@c15t-destinations`

**Governance**:
- Core team owns @c15t-destinations scope
- Community uses their own scopes
- Can promote community packages to official

**Benefit**: Clearer ecosystem, easier to find official vs community

---

## Performance Considerations

### Tree-Shaking (Modern Bundlers)

```typescript
// With Vite, Webpack 5, Turbopack
import { posthog } from '@c15t/destinations';

// Bundler only includes:
// - posthog/ folder code
// - Shared types.ts (if used)
// - Shared utils.ts (if used)

// Result: ~50-100KB (not full 800KB)
```

**Verdict**: Bundle size difference is minimal with modern tooling.

---

### Node Modules Size

**Option A:**
```
node_modules/@c15t/destinations/  800KB
└── (one package)
```

**Option B:**
```
node_modules/
├── @c15t-destinations/posthog/    50KB
├── @c15t-destinations/meta-pixel/ 80KB
└── @c15t-destinations/google-analytics/ 70KB
Total: 200KB (only 3 destinations)
```

**Verdict**: Multi-package saves disk space if you don't use all destinations.

---

## Versioning Examples

### Option A: Mono-Package Versioning

```json
{
  "name": "@c15t/destinations",
  "version": "1.5.0",
  "changelog": {
    "1.5.0": "Added TikTok Pixel destination",
    "1.4.3": "Fixed Meta Pixel bug",
    "1.4.0": "Added Amplitude destination"
  }
}
```

**Problem**: TikTok addition bumps version for everyone (even if they don't use it).

---

### Option B: Multi-Package Versioning

```json
// @c15t-destinations/posthog
{ "version": "1.0.5" }  // Stable, rarely changes

// @c15t-destinations/meta-pixel
{ "version": "1.3.2" }  // Active development, frequent updates

// @c15t-destinations/tiktok-pixel
{ "version": "0.1.0" }  // New, experimental
```

**Benefit**: Independent evolution. Meta Pixel can iterate fast without affecting PostHog users.

---

## CI/CD & Publishing

### Option A: Mono-Package CI/CD

```yaml
# .github/workflows/publish-destinations.yml
name: Publish Destinations

on:
  push:
    paths:
      - 'packages/destinations/**'

jobs:
  publish:
    - run: cd packages/destinations && npm publish
```

**Simple**: One workflow, one publish.

---

### Option B: Multi-Package CI/CD

```yaml
# .github/workflows/publish-destinations.yml
name: Publish Destinations

on:
  push:
    paths:
      - 'packages/destinations-*/**'

jobs:
  publish:
    strategy:
      matrix:
        package: [posthog, meta-pixel, google-analytics, ...]
    steps:
      - run: cd packages/destinations-${{ matrix.package }} && npm publish
```

**Complex**: Multiple workflows or matrix, selective publishing.

**Better with Changesets:**
```bash
npx changeset add
# Select: @c15t-destinations/posthog - patch
# Changesets handles publishing only changed packages
```

---

## Developer Experience

### Option A: Simpler Imports

```typescript
// One import statement
import { 
  posthog, 
  metaPixel, 
  googleAnalytics,
  mixpanel 
} from '@c15t/destinations';
```

**Cleaner**: One import line.

---

### Option B: Explicit Imports

```typescript
// Multiple import statements
import { posthog } from '@c15t-destinations/posthog';
import { metaPixel } from '@c15t-destinations/meta-pixel';
import { googleAnalytics } from '@c15t-destinations/google-analytics';
import { mixpanel } from '@c15t-destinations/mixpanel';
```

**Explicit**: Clear where each comes from, better for debugging.

---

## Migration Path (If We Split Later)

### Step 1: Extract Each Destination to Own Package

```bash
# Create new packages
mkdir packages/destinations-posthog
mv packages/destinations/src/posthog packages/destinations-posthog/src
# ... repeat for each
```

### Step 2: Make @c15t/destinations a Meta-Package

```json
// packages/destinations/package.json
{
  "name": "@c15t/destinations",
  "version": "2.0.0",
  "dependencies": {
    "@c15t-destinations/posthog": "^1.0.0",
    "@c15t-destinations/meta-pixel": "^1.0.0",
    "@c15t-destinations/google-analytics": "^1.0.0"
  },
  "exports": {
    ".": "./dist/index.js",  // Re-exports all
    "./posthog": "@c15t-destinations/posthog",
    "./meta-pixel": "@c15t-destinations/meta-pixel"
  }
}
```

### Step 3: Backwards Compatibility

```typescript
// Still works (uses meta-package)
import { posthog } from '@c15t/destinations';

// New way (smaller bundle)
import { posthog } from '@c15t-destinations/posthog';

// Both work! No breaking change.
```

### Step 4: Deprecate Meta-Package (Optional)

After 6-12 months, optionally deprecate meta-package:

```
npm deprecate @c15t/destinations "Use @c15t-destinations/* packages instead"
```

---

## Recommendation: Start Mono, Split Later

### Launch (Phase 1) - Mono-Package

**Package**: `@c15t/destinations`

**Timeline**: Months 1-12

**Why**:
- ✅ Faster to ship (simpler setup)
- ✅ Easier for early adopters
- ✅ Learn which destinations matter
- ✅ Build momentum before complexity

**Destinations to include**:
1. PostHog (analytics)
2. Meta Pixel (marketing)
3. Google Analytics (analytics)
4. Mixpanel (analytics)
5. Amplitude (analytics)
6. TikTok Pixel (marketing)
7. LinkedIn Insights (marketing)
8. Console (debugging)
9. c15t Consent (CMP integration)

**Target**: ~800KB total, but tree-shakes to 50-150KB per destination

---

### Scale (Phase 2) - Split When Needed

**Trigger to split**: Any of these
- 20+ destinations in package
- Community requests (bundle too large)
- Frequent breaking changes affecting all users
- 1000+ production users

**Migration**: 
- Create scoped packages
- Make @c15t/destinations a meta-package
- Maintain backwards compatibility
- Document migration

---

## Implementation: Browser + Server in One

**Critical**: Each destination should support both browser and server in a single implementation.

```typescript
// packages/destinations/src/meta-pixel/index.ts

import { type } from '@standard-schema/spec';
import type { 
  UniversalDestinationPlugin,
  TrackEvent,
  EventContext,
  Script 
} from '@c15t/backend/v2/types';

/**
 * Meta Pixel - Universal destination (server + client)
 */
class MetaPixelDestination implements UniversalDestinationPlugin<MetaPixelSettings> {
  readonly type = 'meta-pixel';
  readonly name = 'Meta Pixel';
  readonly description = 'Facebook/Meta advertising and analytics';
  readonly category = 'marketing';
  readonly version = '1.0.0';
  readonly gdprCompliant = true;
  readonly requiredConsent = ['marketing'] as const;
  readonly homepage = 'https://developers.facebook.com/docs/meta-pixel';
  readonly icon = 'https://cdn.c15t.com/icons/meta-pixel.svg';
  
  /**
   * SERVER-SIDE: Send to Conversions API
   * Runs in Cloudflare Worker / Node.js
   */
  async track(event: TrackEvent, context: EventContext): Promise<void> {
    if (!this.settings.accessToken) {
      // No access token = client-side only mode
      return;
    }
    
    // Send to Meta Conversions API
    await fetch(`https://graph.facebook.com/v18.0/${this.settings.pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: event.name,
          event_id: context.messageId,  // Deduplication
          event_time: Math.floor(new Date(context.timestamp).getTime() / 1000),
          action_source: 'website',
          user_data: {
            client_ip_address: context.ip,
            client_user_agent: context.userAgent,
            fbc: context.cookies?.['_fbc'],
            fbp: context.cookies?.['_fbp'],
          },
          custom_data: event.properties,
        }],
        access_token: this.settings.accessToken,
      }),
    });
  }
  
  /**
   * CLIENT-SIDE: Generate pixel script
   * Runs in browser
   */
  generateScript(
    settings: MetaPixelSettings,
    consent: AnalyticsConsent
  ): Script | null {
    // Only load if marketing consent
    if (!consent.marketing) {
      return null;
    }
    
    return {
      id: 'meta-pixel',
      category: 'marketing',
      textContent: `
!function(f,b,e,v,n,t,s){...}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${settings.pixelId}');
fbq('track', 'PageView');
      `,
      persistAfterConsentRevoked: true,
      onDelete: () => {
        if (window.fbq) {
          window.fbq('consent', 'revoke');
        }
      },
    };
  }
}
```

**Key points**:
- ✅ One class, both server and client methods
- ✅ Server-side is optional (can be client-only)
- ✅ Client-side is optional (can be server-only)
- ✅ Both controlled by same settings
- ✅ Event deduplication via event_id

---

## Decision Matrix

| Factor | Weight | Mono-Package Score | Multi-Package Score | Winner |
|--------|--------|-------------------|---------------------|--------|
| **Initial Simplicity** | High | 10/10 | 5/10 | Mono |
| **Bundle Size** | Medium | 6/10 | 10/10 | Multi |
| **Discovery** | High | 9/10 | 6/10 | Mono |
| **Maintenance** | Medium | 8/10 | 5/10 | Mono |
| **Versioning Flexibility** | Low | 5/10 | 10/10 | Multi |
| **Community Contributions** | Medium | 6/10 | 9/10 | Multi |
| **Install Speed** | Low | 7/10 | 9/10 | Multi |
| **DX (Imports)** | Medium | 9/10 | 7/10 | Mono |

**Weighted Total**: 
- Mono-Package: **78/100**
- Multi-Package: **71/100**

**Winner**: Start with **mono-package**, split if needed.

---

## Real-World Examples

### Mono-Package Approach

**Examples:**
- `@aws-sdk/client-s3` (AWS SDK v3 - each service is separate)
- `@stripe/stripe-js` (one package, tree-shakes well)
- `react` (one package, multiple entry points)

**Works well when:**
- Related functionality
- Users likely need multiple modules
- Strong tree-shaking support

---

### Multi-Package Approach

**Examples:**
- `@aws-sdk/*` (100+ packages)
- `@babel/plugin-*` (many plugins)
- `@testing-library/*` (react, vue, svelte separate)

**Works well when:**
- Many packages (20+)
- Users typically need 1-2
- Independent versioning critical

---

## Recommendation Summary

### Phase 1: Launch (✅ Recommended)

**Package**: `@c15t/destinations` (mono-package)

**Includes**:
- 8-10 core destinations
- All in one package
- Tree-shaking friendly
- Simple to install and use

**When**: Now through first 500 users

---

### Phase 2: Scale (⏳ Future)

**Trigger**: Any of
- 20+ destinations
- Bundle size complaints
- Community requests
- Frequent breaking changes

**Migration**: 
- Split into `@c15t-destinations/*`
- Keep `@c15t/destinations` as meta-package
- Backwards compatible

**When**: 12+ months or when needed

---

## Additional Improvements (From Architecture Analysis)

While comparing patterns, we should add these features:

### 1. Destination Metadata ⭐ **HIGH PRIORITY**

```typescript
export interface DestinationPlugin {
  // Core
  readonly type: string;
  readonly version: string;
  
  // NEW: Metadata for better UX
  readonly name: string;           // 'Meta Pixel' (human-readable)
  readonly description: string;    // 'Facebook advertising and analytics'
  readonly category: 'analytics' | 'marketing' | 'crm' | 'error-tracking';
  readonly homepage?: string;      // 'https://developers.facebook.com'
  readonly icon?: string;          // Icon URL for admin UI
  readonly author?: string;        // '@c15t/team' or community
  
  // Consent & settings
  readonly gdprCompliant: boolean;
  readonly settingsSchema: StandardSchemaV1<TSettings>;
  readonly requiredConsent: ReadonlyArray<keyof AnalyticsConsent>;
  
  // ... rest of interface
}
```

**Benefits**:
- Better admin UI (icons, descriptions)
- Easier discovery (search by category)
- Better documentation (homepage links)
- Community-friendly (author field)

---

### 2. Debug API ⭐ **MEDIUM PRIORITY**

```typescript
export interface AnalyticsDebugAPI {
  // Queue inspection
  getQueue(): AnalyticsEvent[];
  getQueueSize(): number;
  clearQueue(): void;
  
  // Destination inspection
  getDestinations(): DestinationInfo[];
  getDestinationStatus(type: string): 'connected' | 'disconnected' | 'error';
  
  // Event history (dev mode only)
  getEventHistory(limit?: number): AnalyticsEvent[];
  inspectEvent(eventId: string): EventDetails | null;
  
  // Testing helpers
  simulateEvent(event: AnalyticsEvent): Promise<void>;
  dryRun: boolean;  // Events queued but not sent
}

// Usage in development
if (process.env.NODE_ENV === 'development') {
  console.log('Queue size:', analytics.debug.getQueueSize());
  console.log('Destinations:', analytics.debug.getDestinations());
  
  // Inspect specific event
  const event = analytics.debug.inspectEvent('msg-123');
  console.log('Event details:', event);
}
```

---

### 3. Enhanced Error Handling ⭐ **HIGH PRIORITY**

```typescript
export interface AnalyticsOptions {
  // ... existing options
  
  /**
   * Global error handler for analytics failures
   */
  onError?: (error: AnalyticsError) => void;
  
  /**
   * Whether to throw errors or fail silently
   * @default false (fail silently - analytics should never break the app)
   */
  throwErrors?: boolean;
  
  /**
   * Retry configuration
   */
  retry?: {
    maxAttempts: number;
    backoff: 'exponential' | 'linear' | 'fixed';
  };
}

export interface AnalyticsError extends Error {
  destination?: string;
  event?: AnalyticsEvent;
  context?: EventContext;
  attempt?: number;
  retriable: boolean;
}

// Usage
const instance = c15tInstance({
  analytics: {
    destinations: [...],
    onError: (error) => {
      console.error('[Analytics]', error.message, {
        destination: error.destination,
        event: error.event,
        retriable: error.retriable,
      });
      
      // Report to error tracking
      Sentry.captureException(error);
    },
    throwErrors: false,  // Never break the app
    retry: {
      maxAttempts: 3,
      backoff: 'exponential',
    },
  }
});
```

---

## Final Recommendation

### Start with Mono-Package

```
packages/destinations/
└── @c15t/destinations (all destinations in one package)
```

**Reasons**:
1. Faster to ship (simpler setup)
2. Easier for early users (one install command)
3. Better discovery (one package to find)
4. Modern bundlers tree-shake anyway
5. Can split later if needed (non-breaking)

**Add these improvements**:
1. ✅ **Destination metadata** (name, description, icon, category)
2. ✅ **Enhanced error handling** (onError, throwErrors, retry)
3. ⚠️ **Debug API** (optional, for development)

**Don't split until**:
- 20+ destinations, OR
- Users complain about bundle size, OR
- Versioning becomes painful

---

## Updated Package Structure

```
packages/destinations/
├── src/
│   ├── index.ts                    # Exports + auto-registration
│   ├── types.ts                    # Shared types
│   ├── utils/                      # Shared utilities
│   │   ├── http-client.ts
│   │   ├── event-mapper.ts
│   │   └── validation.ts
│   │
│   ├── posthog/
│   │   ├── index.ts                # Export: posthog(), posthogDestination
│   │   ├── destination.ts          # Class: PostHogDestination
│   │   ├── types.ts                # Settings, events
│   │   ├── client.ts               # API client (server-side)
│   │   └── __tests__/
│   │
│   ├── meta-pixel/
│   │   ├── index.ts
│   │   ├── destination.ts          # Implements server + client
│   │   ├── types.ts
│   │   ├── conversions-api.ts      # Server-side handler
│   │   ├── pixel-script.ts         # Client-side script generation
│   │   └── __tests__/
│   │
│   └── ... (more destinations)
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Summary

| Aspect | Decision | Timeline |
|--------|----------|----------|
| **Initial Package** | Mono-package (`@c15t/destinations`) | ✅ Now |
| **Package Count** | 1 package with 8-10 destinations | Phase 1 |
| **Future Split** | To `@c15t-destinations/*` if needed | Phase 2 (12+ months) |
| **Add Metadata** | name, description, icon, category | ✅ Now |
| **Add Error Handling** | onError, throwErrors, retry config | ✅ Now |
| **Add Debug API** | getQueue, getDestinations, inspect | ⚠️ Later |
| **Browser + Server** | One destination class, both methods | ✅ Now |

**Conclusion**: Start simple (mono-package), scale smart (split later if needed), add metadata and error handling now.

---

**This gives us the best of both worlds with a clear evolution path!** 🚀
