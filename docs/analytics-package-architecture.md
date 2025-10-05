# Analytics Package Architecture

## The Problem We're Solving

**Original concern**: "Due to the amount of destinations and how often they update, we can't push an update to `@c15t/backend` every time a destination changes."

This is a critical constraint that shapes our entire architecture.

## The Solution: Separate Packages

We split analytics into **two independent packages** with clear responsibilities:

### Package 1: `@c15t/backend` (Protocol Definition)

**What it contains:**
- `DestinationPlugin` interface (the contract)
- `DestinationManager` (the orchestrator)
- `DestinationRegistry` (the factory registry)
- `DestinationConfig<T>` type (the config interface)
- `createDestinationConfig<T>()` helper (config builder utility)
- Event processing pipeline
- GDPR consent filtering logic

**What it does NOT contain:**
- ❌ No specific destination implementations (no PostHog, no Mixpanel, etc.)
- ❌ No destination-specific types or schemas
- ❌ No destination builder functions (no `destinations.posthog()`)

**When it's updated:**
- Only when the core protocol changes
- Only when event processing logic changes
- Only when consent filtering changes
- Rarely! Maybe once per quarter or less

### Package 2: `@c15t/destinations` (Implementations)

**What it contains:**
- ✅ All destination implementations (PostHog, Mixpanel, GA4, etc.)
- ✅ Destination-specific settings schemas (Zod)
- ✅ Destination factories (`posthogDestination`)
- ✅ Destination builder functions (`posthog()`)
- ✅ Auto-registration code (registers with global registry on import)

**When it's updated:**
- When a destination needs a bug fix
- When a destination adds a new feature
- When a new destination is added
- Frequently! Could be multiple times per week

## How They Work Together

```typescript
// packages/destinations/src/posthog/index.ts

import { 
  createDestinationConfig, 
  type DestinationConfig,
  type DestinationPlugin,
  type DestinationFactory
} from '@c15t/backend/v2/types';  // Import protocol from backend
import { z } from 'zod';

// Define settings schema
export const PostHogSettingsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  host: z.string().url().default('https://app.posthog.com'),
});

export type PostHogSettings = z.infer<typeof PostHogSettingsSchema>;

// Implement the plugin
class PostHogDestination implements DestinationPlugin<PostHogSettings> {
  readonly type = 'posthog';
  readonly version = '1.0.0';
  readonly gdprCompliant = true;
  readonly settingsSchema = PostHogSettingsSchema;
  readonly requiredConsent = ['measurement'] as const;
  
  async initialize(settings: PostHogSettings): Promise<void> {
    // Initialize PostHog client
  }
  
  async track(event: TrackEvent, context: EventContext): Promise<void> {
    // Send to PostHog
  }
  
  // ... other methods
}

// Export factory (used by DestinationManager)
export const posthogDestination: DestinationFactory<PostHogSettings> = 
  async (settings) => {
    const dest = new PostHogDestination();
    await dest.initialize(settings);
    return dest;
  };

// Export builder (used by developers)
export function posthog(
  settings: PostHogSettings,
  enabled = true
): DestinationConfig<PostHogSettings> {
  return createDestinationConfig('posthog', settings, enabled);
}
```

```typescript
// packages/destinations/src/index.ts

import { destinationRegistry } from '@c15t/backend/v2/analytics';
import { posthogDestination } from './posthog';
import { mixpanelDestination } from './mixpanel';

// Auto-register when package is imported
destinationRegistry.register('posthog', posthogDestination);
destinationRegistry.register('mixpanel', mixpanelDestination);

// Export builders for users
export { posthog } from './posthog';
export { mixpanel } from './mixpanel';

// Export types
export type { PostHogSettings } from './posthog';
export type { MixpanelSettings } from './mixpanel';
```

## Developer Experience

### Before (Wrong - Don't Do This)

```typescript
// ❌ WRONG: Importing from backend
import { c15tInstance, destinations } from '@c15t/backend/v2';

const instance = c15tInstance({
  analytics: {
    destinations: [
      destinations.posthog({ apiKey: 'xxx' })  // ❌ Doesn't exist in backend!
    ]
  }
});
```

### After (Correct - Do This)

```typescript
// ✅ CORRECT: Import protocol from backend, builders from destinations
import { c15tInstance } from '@c15t/backend/v2';
import { posthog, mixpanel } from '@c15t/destinations';

const instance = c15tInstance({
  analytics: {
    destinations: [
      posthog({ apiKey: 'xxx' }),        // ✅ From @c15t/destinations
      mixpanel({ token: 'yyy' }),        // ✅ From @c15t/destinations
    ]
  }
});
```

### Custom Destinations

Developers can create their own destinations following the same pattern:

```typescript
// app/destinations/my-custom.ts

import { 
  createDestinationConfig,
  type DestinationConfig,
  type DestinationPlugin,
  type DestinationFactory
} from '@c15t/backend/v2/types';
import { z } from 'zod';

// 1. Define settings
const MySettingsSchema = z.object({
  apiKey: z.string(),
  endpoint: z.string().url(),
});

type MySettings = z.infer<typeof MySettingsSchema>;

// 2. Implement plugin
class MyDestination implements DestinationPlugin<MySettings> {
  readonly type = 'my-custom';
  readonly version = '1.0.0';
  readonly settingsSchema = MySettingsSchema;
  readonly requiredConsent = ['measurement'] as const;
  
  async initialize(settings: MySettings): Promise<void> {
    // ...
  }
  
  async track(event, context): Promise<void> {
    // ...
  }
}

// 3. Export factory
export const myCustomDestination: DestinationFactory<MySettings> = 
  async (settings) => {
    const dest = new MyDestination();
    await dest.initialize(settings);
    return dest;
  };

// 4. Export builder
export function myCustom(
  settings: MySettings,
  enabled = true
): DestinationConfig<MySettings> {
  return createDestinationConfig('my-custom', settings, enabled);
}
```

```typescript
// app/server.ts

import { c15tInstance } from '@c15t/backend/v2';
import { posthog } from '@c15t/destinations';
import { myCustomDestination, myCustom } from './destinations/my-custom';

const instance = c15tInstance({
  analytics: {
    destinations: [
      posthog({ apiKey: 'xxx' }),           // Built-in
      myCustom({ apiKey: 'yyy', endpoint: '...' }),  // Custom
    ],
    customDestinations: {
      'my-custom': myCustomDestination,     // Register factory
    }
  }
});
```

## Benefits of This Architecture

### ✅ Independent Versioning

- **Backend**: `@c15t/backend@2.0.0` (stable, rarely changes)
- **Destinations**: `@c15t/destinations@1.5.3` (frequently updated)

A bug fix in PostHog doesn't require a backend release!

### ✅ Smaller Bundles

Users only pay for what they use. If they only need PostHog:

```json
{
  "dependencies": {
    "@c15t/backend": "^2.0.0",
    "@c15t/destinations": "^1.5.3"  // Contains all destinations
  }
}
```

Future optimization (scoped packages):
```json
{
  "dependencies": {
    "@c15t/backend": "^2.0.0",
    "@c15t/destinations-posthog": "^1.2.0",  // Only PostHog
    "@c15t/destinations-mixpanel": "^1.0.5"  // Only Mixpanel
  }
}
```

### ✅ Faster Iteration

Destination maintainers can:
- Release new features immediately
- Fix bugs without backend coordination
- Add new destinations without backend approval
- Version destinations independently

### ✅ Clear Separation of Concerns

- **Backend Team**: Maintains protocol, event processing, consent logic
- **Destination Team**: Maintains integrations, API clients, mappings
- **Community**: Can contribute new destinations easily

### ✅ Type Safety Preserved

TypeScript inference works perfectly across packages:

```typescript
import { posthog } from '@c15t/destinations';

const config = posthog({
  apiKey: 'xxx',
  wrongProp: 'yyy',  // ❌ TypeScript error! Property doesn't exist
});
```

## Package Dependency Graph

```
┌─────────────────┐
│  User's App     │
└────────┬────────┘
         │ imports both
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────┐  ┌────────────┐
│Backend│◄─│Destinations│  destinations depends on backend (for types)
└──────┘  └────────────┘
   │
   │ defines protocol
   ▼
┌──────────────────────────┐
│ DestinationPlugin        │
│ DestinationConfig        │
│ DestinationFactory       │
│ createDestinationConfig  │
└──────────────────────────┘
```

## Migration from Event Sidekick

**Old (Event Sidekick):**
```typescript
import { NextTrackerServerApp } from '@everfund/event-sidekick';

const server = new NextTrackerServerApp({
  destinations: [
    {
      type: 'posthog',
      enabled: true,
      settings: { apiKey: 'xxx' }
    }
  ]
});
```

**New (c15t):**
```typescript
import { c15tInstance } from '@c15t/backend/v2';
import { posthog } from '@c15t/destinations';

const instance = c15tInstance({
  analytics: {
    destinations: [
      posthog({ apiKey: 'xxx' })
    ]
  }
});
```

## Publishing Strategy

### Backend Releases (Rare)
```bash
# Only when protocol changes
cd packages/backend
npm version minor  # 2.0.0 → 2.1.0
npm publish
```

### Destinations Releases (Frequent)
```bash
# Multiple times per week is fine!
cd packages/destinations
npm version patch  # 1.5.3 → 1.5.4
npm publish
```

### Changeset Workflow

```bash
# In destinations package
npx changeset add
# Choose: @c15t/destinations - patch
# Describe: "Fix PostHog connection timeout"

# Publish
npx changeset version
git commit -am "Version packages"
npx changeset publish
```

## Summary

| Aspect | Backend Package | Destinations Package |
|--------|----------------|---------------------|
| **Contains** | Protocol & Engine | Implementations |
| **Updates** | Rarely (quarterly) | Frequently (weekly) |
| **Breaking Changes** | Major impact | Isolated impact |
| **Type Safety** | Defines interfaces | Uses interfaces |
| **Bundle Size** | Small (~50KB) | Large (~500KB) |
| **Dependencies** | Core only | Backend + APIs |

**Key Takeaway**: Backend is the **protocol**, destinations are the **plugins**. They're versioned, published, and maintained independently.

---

**Questions?** See [migration-plan-event-sidekick.md](./migration-plan-event-sidekick.md) for full implementation details.
