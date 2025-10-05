# Key Improvements to Analytics Architecture

This document summarizes the three major architectural improvements based on requirements.

## 1. Standard Schema Support (Validator Agnostic)

### The Problem
Originally, the plan coupled directly to Zod for validation. This prevents developers using other validation libraries (ArkType, Valibot, etc.) from creating custom destinations.

### The Solution
Use [Standard Schema](https://standardschema.dev/) - a universal protocol that any validation library can implement.

### Implementation

```typescript
import type { StandardSchemaV1 } from '@standard-schema/spec';

export interface DestinationPlugin<TSettings = Record<string, unknown>> {
	// ❌ Before: Coupled to Zod
	// readonly settingsSchema: z.ZodType<TSettings>;
	
	// ✅ After: Works with any validator
	readonly settingsSchema: StandardSchemaV1<TSettings>;
	
	// ... rest of interface
}
```

### Developer Experience

```typescript
// Works with Zod
import { z } from 'zod';

class PostHogDestination implements DestinationPlugin<PostHogSettings> {
	readonly settingsSchema = z.object({
		apiKey: z.string(),
		host: z.string().url().optional(),
	});
}

// Works with ArkType
import { type } from 'arktype';

class AmplitudeDestination implements DestinationPlugin<AmplitudeSettings> {
	readonly settingsSchema = type({
		apiKey: 'string',
		secretKey: 'string',
		'serverUrl?': 'string.url',
	});
}

// Works with Valibot
import * as v from 'valibot';

class MixpanelDestination implements DestinationPlugin<MixpanelSettings> {
	readonly settingsSchema = v.object({
		projectToken: v.string(),
		apiSecret: v.optional(v.string()),
	});
}
```

### Benefits
- ✅ Developers choose their preferred validator
- ✅ No vendor lock-in to Zod
- ✅ Better performance (ArkType is 5-10x faster than Zod)
- ✅ Type inference works with all validators
- ✅ Easier adoption for teams already using other validators

---

## 2. Lazy Loading with Runtime Registration

### The Problem
Original plan loaded all destinations at startup, which:
- Slows down application initialization
- Wastes memory on unused destinations
- Makes dynamic configuration difficult

### The Solution
Lazy load destinations on first use + support runtime registration.

### Implementation

```typescript
export class DestinationManager {
	private destinations = new Map<string, DestinationPlugin>();
	private loadingPromises = new Map<string, Promise<DestinationPlugin>>();
	
	/**
	 * Lazy load a destination on first use
	 * Cached after first load for performance
	 */
	private async lazyLoadDestination(
		type: string, 
		settings: unknown
	): Promise<DestinationPlugin> {
		// Check if already loaded
		if (this.destinations.has(type)) {
			return this.destinations.get(type)!;
		}
		
		// Check if currently loading (avoid duplicate loads)
		if (this.loadingPromises.has(type)) {
			return await this.loadingPromises.get(type)!;
		}
		
		// Start loading
		const loadPromise = (async () => {
			const factory = this.registry.get(type);
			if (!factory) {
				throw new Error(`Destination '${type}' not found`);
			}
			
			const destination = await factory(settings);
			await destination.initialize(settings);
			
			this.destinations.set(type, destination);
			return destination;
		})();
		
		this.loadingPromises.set(type, loadPromise);
		
		try {
			return await loadPromise;
		} finally {
			this.loadingPromises.delete(type);
		}
	}
	
	/**
	 * Register a new destination at runtime
	 */
	async registerDestination<TSettings>(
		type: string,
		factory: DestinationFactory<TSettings>
	): Promise<void> {
		this.registry.register(type, factory);
	}
	
	/**
	 * Add a destination to active destinations at runtime
	 */
	async addDestination(config: DestinationConfig): Promise<void> {
		if (!config.enabled) return;
		await this.lazyLoadDestination(config.type, config.settings);
	}
	
	/**
	 * Remove a destination at runtime
	 */
	async removeDestination(type: string): Promise<void> {
		const destination = this.destinations.get(type);
		if (destination?.destroy) {
			await destination.destroy();
		}
		this.destinations.delete(type);
	}
}
```

### Usage Examples

#### Lazy Loading (Automatic)
```typescript
// Initial setup - no destinations loaded yet
const instance = c15tInstance({
	analytics: {
		destinations: [
			posthog({ apiKey: 'xxx' }),  // Not loaded yet!
			mixpanel({ token: 'yyy' }),  // Not loaded yet!
		]
	}
});

// First event triggers lazy load of all destinations
await analytics.track('Button Clicked');
// → PostHog loads here
// → Mixpanel loads here
```

#### Runtime Registration
```typescript
// Register a custom destination at runtime
import { myCustomDestination } from './custom-destinations';

const context = await instance.$context;

await context.destinationManager?.registerDestination(
	'my-custom',
	myCustomDestination
);

// Now you can use it
await context.destinationManager?.addDestination({
	type: 'my-custom',
	enabled: true,
	settings: { apiKey: 'xxx' }
});
```

#### Dynamic Configuration (Feature Flags)
```typescript
// Add destinations based on feature flags
const context = await instance.$context;

if (featureFlags.enableAmplitude) {
	await context.destinationManager?.addDestination(
		amplitude({ apiKey: env.AMPLITUDE_KEY })
	);
}

if (featureFlags.enableGoogleAnalytics) {
	await context.destinationManager?.addDestination(
		googleAnalytics({ measurementId: env.GA_ID })
	);
}

// Remove destinations dynamically
if (!featureFlags.enableMixpanel) {
	await context.destinationManager?.removeDestination('mixpanel');
}
```

#### A/B Testing
```typescript
// Load different destinations for different user segments
const context = await instance.$context;

if (userSegment === 'premium') {
	// Premium users get more detailed analytics
	await context.destinationManager?.addDestination(
		amplitude({ apiKey: env.AMPLITUDE_KEY })
	);
	await context.destinationManager?.addDestination(
		heap({ appId: env.HEAP_ID })
	);
} else {
	// Free users get basic analytics only
	await context.destinationManager?.addDestination(
		posthog({ apiKey: env.POSTHOG_KEY })
	);
}
```

### Benefits
- ✅ Faster startup (destinations load on first use)
- ✅ Reduced memory footprint (unused destinations not loaded)
- ✅ Better error isolation (failed loads don't crash startup)
- ✅ Dynamic destination management (add/remove at runtime)
- ✅ Feature flag support
- ✅ A/B testing capabilities
- ✅ Environment-specific configurations

---

## 3. GDPR-First Consent Management

### The Problem
Segment's approach bolts consent on as an afterthought. No built-in consent event type, no automatic routing based on consent.

### The Solution
Make consent a first-class citizen with:
1. New `consent` event type for cookie banner normalization
2. Consent sent with every event batch
3. Automatic filtering of events per destination based on consent

### Key Differences from Segment

| Aspect | Segment | c15t |
|--------|---------|------|
| **Consent Event** | ❌ None | ✅ Dedicated `consent` event type |
| **Consent in Requests** | ❌ Optional via middleware | ✅ Required in every batch |
| **Automatic Filtering** | ❌ Manual implementation | ✅ Built into core |
| **Cookie Banner Integration** | ❌ Third-party plugins | ✅ Normalized consent event |
| **GDPR Compliance** | ⚠️ Developer responsibility | ✅ Enforced by system |

### Implementation

#### New Consent Event Type

```typescript
/**
 * Consent event - normalizes cookie banner results
 * Integrates with c15t's existing consent management system
 */
export interface ConsentEvent {
	type: 'consent';
	
	/**
	 * Type of consent - aligns with c15t PolicyType
	 */
	consentType: 
		| 'cookie_banner'
		| 'privacy_policy'
		| 'dpa'
		| 'terms_and_conditions'
		| 'marketing_communications'
		| 'age_verification'
		| 'other';
	
	action: 'granted' | 'updated' | 'revoked';
	
	/**
	 * Flexible consent preferences (not just fixed fields)
	 * Supports standard c15t purposes + custom purposes
	 */
	preferences: Record<string, boolean>;
	
	/**
	 * Domain for multi-domain consent management
	 */
	domain: string;
	
	source: 'cookie_banner' | 'preferences_page' | 'api' | 'other';
	
	/**
	 * Subject identifiers for consent record linkage
	 */
	subjectId?: string;
	externalSubjectId?: string;
	
	
	
	/**
	 * For policy-based consent
	 */
	policyId?: string;
	
	/**
	 * Additional compliance metadata
	 */
	metadata?: Record<string, unknown>;
}

// Added to event union
export type AnalyticsEvent =
	| TrackEvent
	| PageEvent
	| IdentifyEvent
	| GroupEvent
	| AliasEvent
	| ConsentEvent;  // ← NEW!
```

**Why this structure?**
- ✅ Aligns with existing `/consent/set` endpoint contract
- ✅ Flexible `preferences` supports any consent model
- ✅ Can be automatically saved to consent management database
- ✅ Supports multiple consent types (not just cookie banners)
- ✅ Includes all fields needed for GDPR compliance records

#### Consent Always Included

```typescript
/**
 * Every event batch includes current consent state
 */
interface UploadRequest {
	events: AnalyticsEvent[];
	consent: {
		necessary: boolean;
		measurement: boolean;
		marketing: boolean;
		functionality: boolean;
		experience: boolean;
	};  // ← Required field!
}
```

#### Automatic Consent Filtering

```typescript
/**
 * Backend automatically filters events per destination
 */
async function processEvents(
	events: AnalyticsEvent[],
	consent: AnalyticsConsent
) {
	for (const [type, destination] of destinations) {
		// Check if destination has required consent
		const hasConsent = destination.requiredConsent.every(
			purpose => consent[purpose] === true
		);
		
		if (!hasConsent) {
			console.log(`❌ [${type}] Blocked - missing consent`);
			continue;  // Skip this destination
		}
		
		// Send events to this destination
		await destination.sendEvents(events);
		console.log(`✓ [${type}] Sent ${events.length} events`);
	}
}
```

### Real-World Usage

#### Frontend Integration

```typescript
import { analytics } from '@c15t/core';

// User interacts with cookie banner
function onCookieBannerAccept(choices: {
	analytics: boolean;
	marketing: boolean;
	functionality: boolean;
}) {
	// Update consent (sends consent event to backend)
	analytics.updateConsent({
		necessary: true,  // Always true
		measurement: choices.analytics,
		marketing: choices.marketing,
		functionality: choices.functionality,
		experience: false,
	});
}

// Consent is automatically included in all subsequent events
analytics.track('Product Viewed', { productId: '123' });
// Payload includes:
// {
//   events: [{ type: 'track', ... }],
//   consent: { necessary: true, measurement: true, ... }
// }
```

#### Backend Routing

```typescript
/**
 * Example: User only accepts marketing consent
 */
const consent = {
	necessary: true,
	measurement: false,  // ❌ Not granted
	marketing: true,     // ✅ Granted
	functionality: false,
	experience: false,
};

// Event batch arrives
const events = [
	{ type: 'track', name: 'Product Viewed', ... },
	{ type: 'page', name: 'Homepage', ... },
];

/**
 * Destination filtering:
 * 
 * PostHog (requires measurement):
 *   ❌ NO events sent
 * 
 * Meta Pixel (requires marketing):
 *   ✅ BOTH events sent
 * 
 * Google Analytics (requires measurement):
 *   ❌ NO events sent
 * 
 * Console (requires necessary):
 *   ✅ BOTH events sent
 */
```

#### Integration with c15t Consent Management

```typescript
/**
 * Backend handler automatically bridges analytics and consent management
 */
async function handleConsentEvent(event: ConsentEvent, context: EventContext) {
	// 1. Send to analytics destinations (for BI/tracking)
	await destinationManager.processEvent(event, context);
	
	// 2. Record in consent management system (for GDPR compliance)
	await fetch('/consent/set', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			type: event.consentType,
			domain: event.domain,
			subjectId: event.subjectId,
			externalSubjectId: event.externalSubjectId,
			preferences: event.preferences,
			policyId: event.policyId,
			metadata: {
				...event.metadata,
				source: 'analytics_event',
				analyticsEventId: context.messageId,
			}
		})
	});
	
	// Result: Dual compliance
	// ✅ Analytics destinations track consent changes
	// ✅ Consent database records for legal compliance
	// ✅ Future events automatically filtered by preferences
}
```

#### Cookie Banner Providers

```typescript
/**
 * OneTrust Integration
 * 
 * Note: If you need to sync back to OneTrust platform, configure
 * the OneTrust destination which will automatically receive consent events
 */
window.OneTrust.OnConsentChanged(() => {
	const groups = window.OnetrustActiveGroups;
	
	analytics.consent({
		consentType: 'cookie_banner',
		action: 'updated',
		preferences: {
			necessary: true,
			measurement: groups.includes('C0002'),
			marketing: groups.includes('C0004'),
			functionality: groups.includes('C0003'),
			experience: groups.includes('C0005'),
		},
		domain: window.location.hostname,
		source: 'cookie_banner',
		metadata: { 
			groups,
			bannerVersion: OneTrust.GetDomainData().ConsentModel.Version,
			// CMP-specific data in metadata (not a top-level field)
			cmpName: 'onetrust',
			cmpVersion: OneTrust.version
		},
	});
});

/**
 * Cookiebot Integration
 * 
 * If you need Cookiebot sync, add Cookiebot destination to your config
 */
window.addEventListener('CookiebotOnAccept', () => {
	analytics.consent({
		consentType: 'cookie_banner',
		action: 'granted',
		preferences: {
			necessary: true,
			measurement: Cookiebot.consent.statistics,
			marketing: Cookiebot.consent.marketing,
			functionality: Cookiebot.consent.preferences,
			experience: false,
		},
		domain: window.location.hostname,
		source: 'cookie_banner',
		subjectId: Cookiebot.consent.userID,
		metadata: {
			consentID: Cookiebot.consent.consentID,
			cmpName: 'cookiebot',
			cmpVersion: Cookiebot.version,
		},
	});
});

/**
 * Custom Banner Integration
 */
function onCustomBannerSave(preferences: Record<string, boolean>) {
	analytics.consent({
		consentType: 'cookie_banner',
		action: 'updated',
		preferences,
		domain: window.location.hostname,
		source: 'cookie_banner',
		subjectId: userId,
		metadata: {
			customBannerVersion: '1.0.0',
			timestamp: Date.now(),
		},
	});
}

/**
 * Example Backend Config with CMP Destination
 */
import { c15tInstance } from '@c15t/backend/v2';
import { posthog, onetrust, cookiebot } from '@c15t/destinations';

const instance = c15tInstance({
	analytics: {
		destinations: [
			// Analytics
			posthog({ apiKey: env.POSTHOG_KEY }),
			
			// CMP sync (optional - only if you need to sync back to CMP platform)
			onetrust({ 
				apiKey: env.ONETRUST_API_KEY,
				dataSubjectId: env.ONETRUST_DSID 
			}),
		]
	}
});

// Now consent events:
// 1. Go to PostHog (analytics)
// 2. Go to c15t database (compliance)
// 3. Sync to OneTrust platform (via OneTrust destination)
```

#### Strategic Business Value: Dual-CMP for Enterprise Migration

**This architecture enables a critical go-to-market strategy:**

```typescript
/**
 * Enterprise Customer: Currently on OneTrust, evaluating c15t
 * 
 * Traditional approach: "Rip out OneTrust and replace with c15t"
 * ❌ High risk
 * ❌ Long migration
 * ❌ Sales resistance
 * 
 * c15t approach: "Run both platforms simultaneously"
 * ✅ Zero risk
 * ✅ Instant deployment
 * ✅ Easy sale
 */
const enterpriseCustomer = c15tInstance({
	analytics: {
		destinations: [
			posthog({ apiKey: env.POSTHOG_KEY }),
			consent({ apiKey: env.C15T_KEY }),        // c15t Consent (NEW)
			onetrust({ apiKey: env.ONETRUST_KEY }),   // OneTrust (LEGACY - keep during transition)
		]
	}
});

// Benefits:
// 1. Customer keeps existing OneTrust investment (no waste)
// 2. Dual-write builds confidence in c15t platform
// 3. Can validate consent data matches between platforms
// 4. Teams learn c15t while OneTrust is safety net
// 5. Migration is just removing 1 line from config
// 6. Can re-enable OneTrust instantly if needed
```

**Migration Path:**
```
Month 1-2: Install c15t, dual-write to OneTrust + c15t Consent
  → Build confidence in c15t platform
  → Validate data parity
  → Train team on new interface

Month 3-4: Gradually migrate internal tools to c15t API
  → Admin dashboards point to c15t
  → Compliance reports from c15t
  → OneTrust remains as backup

Month 5: Remove OneTrust destination
  → ONE config change
  → Zero downtime
  → Cancel OneTrust license ($50k/year saved!)
```

**Sales Advantage:**
- **Traditional CMP vendors**: "Replace OneTrust" (scary!)
- **c15t**: "Work alongside OneTrust" (safe!)
  - Lower sales friction
  - Faster time-to-value
  - Land & expand strategy
  - Competitive moat (OneTrust can't easily match this flexibility)

```typescript
/**
 * Privacy Policy Acceptance
 */
function onPrivacyPolicyAccept(policyId: string) {
	analytics.consent({
		consentType: 'privacy_policy',
		action: 'granted',
		preferences: {
			privacy_policy: true,
		},
		domain: window.location.hostname,
		source: 'preferences_page',
		policyId,
		subjectId: userId,
	});
}
```

### Benefits
- ✅ GDPR compliance built-in (not bolted on)
- ✅ No manual consent checking required
- ✅ Automatic event routing based on consent
- ✅ **CMP-agnostic architecture**: No hardcoded provider field
- ✅ **Extensible CMP integration**: CMPs create their own destination plugins
- ✅ **Clean separation**: Consent data vs CMP platform sync
- ✅ **Dual-purpose**: Analytics tracking + compliance records
- ✅ **Single source of truth**: One consent event updates all systems
- ✅ **Audit trail**: All consent changes tracked in database
- ✅ **Multi-consent types**: Cookie banners, privacy policies, DPAs, etc.
- ✅ Real-time consent updates
- ✅ No events sent to unauthorized destinations
- ✅ **Compatible with existing c15t consent management**
- ✅ **Opt-in CMP sync**: Only sync back to CMP platform if destination configured

---

## Summary of All Improvements

| Feature | Before | After | Business Impact |
|---------|--------|-------|-----------------|
| **Validation Library** | Zod only | Standard Schema (any validator) | Broader developer appeal |
| **Destination Loading** | Eager (all at startup) | Lazy (on first use) | Faster startup, lower costs |
| **Runtime Config** | Static | Dynamic (add/remove at runtime) | Feature flags, A/B testing |
| **Consent Management** | Not in plan | Built-in, GDPR-first | Legal compliance guaranteed |
| **Consent Event** | Not in spec | New event type | Cookie banner normalization |
| **Consent Routing** | Manual | Automatic | Zero consent violations |
| **CMP Provider Field** | Hardcoded | Destination plugin pattern | **Enterprise migration strategy** |
| **Multi-CMP Support** | Not possible | Dual-write enabled | **Land enterprise customers** |
| **Package Separation** | ✅ Already planned | ✅ Maintained | Independent versioning |

### 💰 Business Impact of CMP Destination Pattern

The biggest competitive advantage is the **zero-friction enterprise migration path**:

**Traditional CMP Sales Cycle:**
```
Sales: "Replace OneTrust with our product"
Customer: "That's risky, long, and expensive"
Sales: "But we're better!"
Customer: "Come back in 18 months"
Result: ❌ Lost deal
```

**c15t Sales Cycle:**
```
Sales: "Install c15t alongside OneTrust"
Customer: "No migration needed?"
Sales: "None. Dual-write to both. Remove OneTrust when ready."
Customer: "Let's start next week!"
Result: ✅ Deal closed, fast migration path, upsell opportunity
```

**Economics:**
- OneTrust license: ~$50k-200k/year (enterprise)
- c15t position: "Try us for free, we'll work with OneTrust"
- After 6 months: Customer removes OneTrust (instant ROI)
- c15t wins: Long-term customer relationship

## Next Steps

All three documents have been updated to reflect these improvements:

1. **migration-plan-event-sidekick.md** - Updated goals, added Standard Schema, lazy loading, and consent management
2. **analytics-type-safe-api.md** - Updated type definitions to use Standard Schema
3. **analytics-implementation-roadmap.md** - Updated implementation tasks

Ready to start implementation with these improvements in place! 🚀