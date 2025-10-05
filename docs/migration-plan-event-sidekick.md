# Event Sidekick & Detective Migration Plan

## Executive Summary

This document outlines the migration strategy for integrating `event-sidekick` and `event-detective` functionality into the c15t v2 backend with enhanced type safety, GDPR compliance, and developer extensibility.

## Current State Analysis

### Event Sidekick (Server-Side)
- Uses Segment Actions framework for destination handling
- Provides `NextTrackerServerApp` and `NextTrackerServerPages` for Next.js integration
- Handles event enrichment, validation, and routing
- Supports custom subscriptions and mappings
- Includes IP parsing and Sentry integration

### Event Detective (Client-Side)
- Already migrated to `packages/core/src/analytics/`
- Provides React hooks and context providers
- Handles client-side event tracking and queueing

### Current v2 Backend
- Has basic analytics contracts (`analyticsContracts`)
- Initial `DestinationManager` implementation
- Dynamic destination loading from `@c15t/destinations` package
- Basic PostHog integration completed

## Goals

1. **Type Safety**: Full TypeScript inference for destination configs and custom destinations
2. **Runtime Validation**: Use [Standard Schema](https://standardschema.dev/) to support any validation library (Zod, ArkType, Valibot, etc.)
3. **GDPR-First Design**: Consent management built into the core with explicit consent tracking per request
4. **Consent Event Type**: New event type for normalizing cookie banner payloads, distinct from Segment's approach
5. **Smart Routing**: Events only sent to destinations matching user's consent preferences
6. **Developer Extensibility**: Easy API for adding custom destinations with any validator
7. **Lazy Loading**: Destinations loaded on-demand with runtime registration support
8. **Drop-in Replacement**: Similar API surface to event-sidekick for smooth migration
9. **Decoupled from Segment**: Own destination protocol independent of Segment Actions
10. **Separate Destination Package**: Destinations live in `@c15t/destinations` and are versioned independently from backend. Backend only defines the plugin interface/protocol. This allows destinations to be updated without requiring backend releases

## Architecture Design

### 1. Destination Plugin System

```typescript
// packages/backend/src/v2/handlers/analytics/destination-plugin.ts

import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Base destination plugin interface
 * Uses Standard Schema to support any validation library (Zod, ArkType, Valibot, etc.)
 */
export interface DestinationPlugin<TSettings = Record<string, unknown>> {
	// Core identification
	readonly type: string;
	readonly version: string;
	
	// Metadata (for UI/discovery)
	readonly name: string;              // 'Meta Pixel' (human-readable)
	readonly description: string;       // 'Facebook advertising and analytics'
	readonly category: 'analytics' | 'marketing' | 'crm' | 'error-tracking' | 'consent-management' | 'other';
	readonly homepage?: string;         // 'https://developers.facebook.com'
	readonly icon?: string;             // Icon URL for admin UI
	readonly author?: string;           // '@c15t/team' or community contributor
	
	// Compliance
	readonly gdprCompliant: boolean;
	
	/**
	 * Settings schema using Standard Schema protocol
	 * Supports Zod, ArkType, Valibot, or any Standard Schema implementation
	 * 
	 * @example
	 * ```typescript
	 * // With Zod
	 * readonly settingsSchema = z.object({ apiKey: z.string() });
	 * 
	 * // With ArkType
	 * readonly settingsSchema = type({ apiKey: 'string' });
	 * 
	 * // With Valibot
	 * readonly settingsSchema = v.object({ apiKey: v.string() });
	 * ```
	 */
	readonly settingsSchema: StandardSchemaV1<TSettings>;
	
	/**
	 * Required consent purposes for this destination
	 * Used to filter events based on user consent
	 * 
	 * @example
	 * ```typescript
	 * // Marketing destination (only receives events if user consented to marketing)
	 * readonly requiredConsent = ['marketing'] as const;
	 * 
	 * // Analytics destination (requires measurement consent)
	 * readonly requiredConsent = ['measurement'] as const;
	 * ```
	 */
	readonly requiredConsent: Array<keyof AnalyticsConsent>;
	
	// Initialize the destination
	initialize(settings: TSettings): Promise<void>;
	
	// Test connection/authentication
	testConnection(): Promise<boolean>;
	
	// Event handlers (all optional)
	track?(event: TrackEvent, context: EventContext): Promise<void>;
	page?(event: PageEvent, context: EventContext): Promise<void>;
	identify?(event: IdentifyEvent, context: EventContext): Promise<void>;
	group?(event: GroupEvent, context: EventContext): Promise<void>;
	alias?(event: AliasEvent, context: EventContext): Promise<void>;
	
	/**
	 * NEW: Handle consent events from cookie banners
	 * This is unique to c15t - not in Segment spec
	 */
	consent?(event: ConsentEvent, context: EventContext): Promise<void>;
	
	// Lifecycle hooks
	onBeforeEvent?(event: AnalyticsEvent): Promise<AnalyticsEvent>;
	onAfterEvent?(event: AnalyticsEvent, result: EventResult): Promise<void>;
	onError?(error: Error, event: AnalyticsEvent): Promise<void>;
	
	// Cleanup
	destroy?(): Promise<void>;
}

/**
 * Event context provided to destination handlers
 * 
 * NOTE: Consent is ALWAYS included in context for GDPR compliance
 * Backend uses this to filter which destinations receive events
 */
export interface EventContext {
	/**
	 * Current user consent state
	 * Sent with EVERY batch of events to ensure up-to-date consent routing
	 */
	consent: AnalyticsConsent;
	userId?: string;
	anonymousId: string;
	sessionId: string;
	timestamp: string;
	messageId: string;
	ip?: string;
	userAgent?: string;
	locale?: string;
	timezone?: string;
}

/**
 * Consent event - NEW event type unique to c15t
 * Integrates with c15t's consent management system
 * Normalizes cookie banner results from any provider (OneTrust, Cookiebot, etc.)
 * 
 * This event is processed by:
 * 1. Analytics destinations (for user preference tracking)
 * 2. c15t consent management (for GDPR compliance records via /consent/set)
 * 
 * @example
 * ```typescript
 * // User accepts only necessary and measurement via cookie banner
 * {
 *   type: 'consent',
 *   consentType: 'cookie_banner',
 *   action: 'updated',
 *   preferences: {
 *     necessary: true,
 *     measurement: true,
 *     marketing: false,
 *     functionality: false,
 *     experience: false
 *   },
 *   domain: 'example.com',
 *   source: 'cookie_banner',
 *   metadata: {
 *     bannerVersion: '2.1.0',
 *     userAgent: 'Mozilla/5.0...'
 *   }
 * }
 * ```
 */
export interface ConsentEvent {
	type: 'consent';
	
	/**
	 * Type of consent being recorded
	 * Aligns with c15t's PolicyType
	 */
	consentType: 
		| 'cookie_banner'
		| 'privacy_policy'
		| 'dpa'
		| 'terms_and_conditions'
		| 'marketing_communications'
		| 'age_verification'
		| 'other';
	
	/**
	 * What happened to the consent
	 */
	action: 'granted' | 'updated' | 'revoked';
	
	/**
	 * User's consent preferences
	 * Flexible structure to support different consent models
	 * 
	 * Standard c15t purposes:
	 * - necessary: Essential cookies/tracking
	 * - measurement: Analytics/metrics
	 * - marketing: Advertising/retargeting
	 * - functionality: Enhanced features
	 * - experience: Personalization
	 * 
	 * But can include custom purposes for specific use cases
	 */
	preferences: Record<string, boolean>;
	
	/**
	 * Domain where consent was given
	 * Used for multi-domain consent management
	 */
	domain: string;
	
	/**
	 * Where the consent event originated
	 */
	source: 'cookie_banner' | 'preferences_page' | 'api' | 'other';
	
	/**
	 * Subject identifiers for consent record linkage
	 */
	subjectId?: string;
	externalSubjectId?: string;
	
	/**
	 * Note: No 'provider' field needed!
	 * Each CMP (OneTrust, Cookiebot, etc.) can create their own
	 * destination plugin to receive consent events and sync back
	 * to their platform if needed.
	 */
	
	/**
	 * For policy-based consent (privacy_policy, dpa, terms_and_conditions)
	 */
	policyId?: string;
	
	/**
	 * Additional metadata for compliance
	 */
	metadata?: Record<string, unknown>;
}

/**
 * All analytics event types including consent
 */
export type AnalyticsEvent =
	| TrackEvent
	| PageEvent
	| IdentifyEvent
	| GroupEvent
	| AliasEvent
	| ConsentEvent;  // ← NEW!
```

### 2. Type-Safe Destination Registry

```typescript
// packages/backend/src/v2/handlers/analytics/destination-registry.ts

/**
 * Destination factory function with validated settings
 */
export type DestinationFactory<TSettings> = (
	settings: TSettings
) => Promise<DestinationPlugin<TSettings>>;

/**
 * Registry for destination plugins
 */
export class DestinationRegistry {
	private factories = new Map<string, DestinationFactory<any>>();
	
	/**
	 * Register a destination plugin factory
	 */
	register<TSettings>(
		type: string,
		factory: DestinationFactory<TSettings>
	): void;
	
	/**
	 * Get a destination factory by type
	 */
	get<TSettings>(type: string): DestinationFactory<TSettings> | undefined;
	
	/**
	 * Check if a destination type is registered
	 */
	has(type: string): boolean;
	
	/**
	 * Get all registered destination types
	 */
	getTypes(): string[];
}

/**
 * Global destination registry
 */
export const destinationRegistry = new DestinationRegistry();
```

### 2b. Lazy Loading & Runtime Registration

```typescript
// packages/backend/src/v2/handlers/analytics/destination-manager.ts

export class DestinationManager {
	private destinations = new Map<string, DestinationPlugin>();
	private loadingPromises = new Map<string, Promise<DestinationPlugin>>();
	
	/**
	 * Lazy load a destination on first use
	 * Cached after first load for performance
	 */
	private async lazyLoadDestination(type: string, settings: unknown): Promise<DestinationPlugin> {
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
			this.logger.debug(`Lazy loading destination: ${type}`);
			
			// Get factory from registry
			const factory = this.registry.get(type);
			if (!factory) {
				throw new Error(
					`Destination '${type}' not found. ` +
					`Available: ${this.registry.getTypes().join(', ')}`
				);
			}
			
			// Create and initialize
			const destination = await factory(settings);
			await destination.initialize(settings);
			
			// Cache it
			this.destinations.set(type, destination);
			this.logger.info(`Loaded destination: ${type}`);
			
			return destination;
		})();
		
		// Cache the promise to avoid duplicate loading
		this.loadingPromises.set(type, loadPromise);
		
		try {
			const destination = await loadPromise;
			return destination;
		} finally {
			// Clean up loading promise
			this.loadingPromises.delete(type);
		}
	}
	
	/**
	 * Register a new destination at runtime
	 * Useful for dynamically adding destinations based on user config
	 * 
	 * @example
	 * ```typescript
	 * // Register a custom destination programmatically
	 * await destinationManager.registerDestination('my-custom', myCustomFactory);
	 * 
	 * // Now you can use it in configs
	 * const config = myCustom({ apiKey: 'xxx' });
	 * ```
	 */
	async registerDestination<TSettings>(
		type: string,
		factory: DestinationFactory<TSettings>
	): Promise<void> {
		this.registry.register(type, factory);
		this.logger.info(`Registered destination at runtime: ${type}`);
	}
	
	/**
	 * Programmatically add a destination to active destinations
	 * Useful for feature flags, A/B testing, or dynamic configuration
	 * 
	 * @example
	 * ```typescript
	 * // Add destination based on feature flag
	 * if (featureFlags.enableAmplitude) {
	 *   await destinationManager.addDestination({
	 *     type: 'amplitude',
	 *     enabled: true,
	 *     settings: { apiKey: env.AMPLITUDE_KEY }
	 *   });
	 * }
	 * ```
	 */
	async addDestination(config: DestinationConfig): Promise<void> {
		if (!config.enabled) {
			return;
		}
		
		// Lazy load the destination
		await this.lazyLoadDestination(config.type, config.settings);
		
		this.logger.info(`Added destination at runtime: ${config.type}`);
	}
	
	/**
	 * Remove a destination at runtime
	 * Useful for disabling destinations dynamically
	 */
	async removeDestination(type: string): Promise<void> {
		const destination = this.destinations.get(type);
		if (destination?.destroy) {
			await destination.destroy();
		}
		this.destinations.delete(type);
		this.logger.info(`Removed destination: ${type}`);
	}
}
```

**Lazy Loading Benefits:**
- ✅ Faster startup time (destinations load on first use)
- ✅ Reduced memory footprint (unused destinations not loaded)
- ✅ Better error isolation (failed loads don't crash startup)
- ✅ Dynamic destination management (add/remove at runtime)

**Usage Example:**
```typescript
// Initial setup - no destinations loaded yet
const instance = c15tInstance({
	analytics: {
		destinations: [
			posthog({ apiKey: 'xxx' }),  // Not loaded yet!
		]
	}
});

// First event triggers lazy load
await analytics.track('Button Clicked');  // PostHog loads here

// Add destination at runtime
await instance.$context.destinationManager?.addDestination(
	mixpanel({ token: 'yyy' })
);

// Remove destination at runtime
await instance.$context.destinationManager?.removeDestination('mixpanel');
```

### 3. Type-Safe Configuration

```typescript
// packages/backend/src/v2/types/analytics.ts

/**
 * Base destination configuration type
 * Used by both backend and destinations package
 */
export interface DestinationConfig<TSettings = Record<string, unknown>> {
	type: string;
	enabled: boolean;
	settings: TSettings;
	/**
	 * Override default required consent for this destination
	 */
	requiredConsent?: Array<keyof AnalyticsConsent>;
}

/**
 * Helper function to create destination configs (exported from backend)
 * Destinations package uses this to create their config builders
 */
export function createDestinationConfig<TSettings>(
	type: string,
	settings: TSettings,
	enabled = true
): DestinationConfig<TSettings> {
	return { type, enabled, settings };
}

/**
 * Analytics configuration with type inference
 */
export interface AnalyticsOptions {
	/**
	 * Enable or disable analytics system
	 */
	enabled?: boolean;
	
	/**
	 * Destination configurations
	 */
	destinations: Array<DestinationConfig<any>>;
	
	/**
	 * Custom destination registry (optional)
	 * Allows adding custom destinations that aren't in @c15t/destinations
	 */
	customDestinations?: Record<string, DestinationFactory<any>>;
	
	/**
	 * Event enrichment function
	 */
	enrichEvent?: (
		event: AnalyticsEvent,
		context: EventContext
	) => Promise<AnalyticsEvent>;
	
	/**
	 * Global event filter
	 */
	filterEvent?: (
		event: AnalyticsEvent,
		context: EventContext
	) => Promise<boolean>;
	
	/**
	 * Global error handler for analytics failures
	 * Analytics should never break your app - handle errors gracefully
	 * 
	 * @param error - The error that occurred
	 * @param context - Context about what failed (destination, event, etc.)
	 * 
	 * @example
	 * ```typescript
	 * onError: (error, context) => {
	 *   console.error('[Analytics]', error.message, context);
	 *   Sentry.captureException(error, { contexts: { analytics: context } });
	 * }
	 * ```
	 */
	onError?: (error: Error, context: {
		destination?: string;
		event?: AnalyticsEvent;
		phase: 'validation' | 'enrichment' | 'filtering' | 'sending';
		retriable: boolean;
	}) => void;
	
	/**
	 * Whether to throw errors or fail silently
	 * @default false (fail silently - analytics should never break the app)
	 */
	throwErrors?: boolean;
	
	/**
	 * Debug mode (development only)
	 * Enables detailed logging and event inspection
	 * @default false
	 */
	debug?: boolean;
}
```

### 4. Improved API for c15tInstance

```typescript
// examples/cloudflare-worker/src/index.ts (new API)

import { c15tInstance } from '@c15t/backend/v2';
// Import destination builders from @c15t/destinations (separate package!)
import { posthog, mixpanel } from '@c15t/destinations';
import { myCustomDestination, myCustom } from './my-custom-destination';

const instance = c15tInstance({
	adapter: kyselyAdapter({
		db: new Kysely({
			dialect: new LibsqlDialect({
				url: 'http://127.0.0.1:8080',
			}),
		}),
		provider: 'sqlite',
	}),
	trustedOrigins: ['https://example.com'],
	analytics: {
		enabled: true,
		destinations: [
			// Built-in destinations from @c15t/destinations package
			// These are builder functions with full type safety
			posthog({
				apiKey: env.POSTHOG_API_KEY,
				host: env.POSTHOG_HOST || 'https://app.posthog.com',
				// TypeScript error if wrong field provided
			}),
			
			// Another built-in destination
			mixpanel({
				projectToken: env.MIXPANEL_TOKEN,
				// Full autocomplete and validation
			}),
			
			// Custom destination builder (defined in your app)
			myCustom({
				apiKey: env.MY_API_KEY,
				endpoint: 'https://api.example.com',
			}),
		],
		
		// Register custom destination factories for loading
		customDestinations: {
			'my-custom': myCustomDestination,
		},
		
		// Optional: Enrich events before processing
		enrichEvent: async (event, context) => {
			return {
				...event,
				properties: {
					...event.properties,
					enrichedAt: new Date().toISOString(),
				},
			};
		},
		
		// Optional: Filter events globally
		filterEvent: async (event, context) => {
			// Don't send internal test events
			return event.properties?.test !== true;
		},
	},
});
```

### 5. Custom Destination Example

```typescript
// examples/cloudflare-worker/src/my-custom-destination.ts

import { z } from 'zod';
import type { 
	DestinationFactory,
	DestinationPlugin,
	EventContext,
	TrackEvent,
	PageEvent,
} from '@c15t/backend/v2/analytics';

/**
 * Settings schema with runtime validation
 */
const MyCustomDestinationSettingsSchema = z.object({
	apiKey: z.string().min(1),
	endpoint: z.string().url(),
	environment: z.enum(['production', 'staging', 'development']).default('production'),
});

type MyCustomDestinationSettings = z.infer<typeof MyCustomDestinationSettingsSchema>;

/**
 * Custom destination plugin implementation
 */
class MyCustomDestination implements DestinationPlugin<MyCustomDestinationSettings> {
	readonly type = 'my-custom';
	readonly version = '1.0.0';
	readonly gdprCompliant = true;
	readonly settingsSchema = MyCustomDestinationSettingsSchema;
	readonly requiredConsent = ['measurement'] as const;
	
	private settings!: MyCustomDestinationSettings;
	
	async initialize(settings: MyCustomDestinationSettings): Promise<void> {
		// Validate settings
		this.settings = this.settingsSchema.parse(settings);
		console.log('MyCustomDestination initialized');
	}
	
	async testConnection(): Promise<boolean> {
		try {
			const response = await fetch(`${this.settings.endpoint}/health`, {
				headers: {
					'Authorization': `Bearer ${this.settings.apiKey}`,
				},
			});
			return response.ok;
		} catch {
			return false;
		}
	}
	
	async track(event: TrackEvent, context: EventContext): Promise<void> {
		await fetch(`${this.settings.endpoint}/events`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.settings.apiKey}`,
			},
			body: JSON.stringify({
				event: event.name,
				properties: event.properties,
				userId: context.userId,
				anonymousId: context.anonymousId,
				timestamp: context.timestamp,
				environment: this.settings.environment,
			}),
		});
	}
	
	async page(event: PageEvent, context: EventContext): Promise<void> {
		// Handle page events
		console.log('Page event:', event.name);
	}
	
	async onError(error: Error, event: AnalyticsEvent): Promise<void> {
		console.error('Error processing event:', error, event);
	}
}

/**
 * Factory function for creating destination instances
 * This is what gets registered in customDestinations
 */
export const myCustomDestination: DestinationFactory<MyCustomDestinationSettings> = 
	async (settings) => {
		const destination = new MyCustomDestination();
		await destination.initialize(settings);
		return destination;
	};

/**
 * Builder function for creating destination configs
 * This provides the same DX as @c15t/destinations exports
 */
export function myCustom(
	settings: MyCustomDestinationSettings,
	enabled = true
): DestinationConfig<MyCustomDestinationSettings> {
	return {
		type: 'my-custom',
		enabled,
		settings,
	};
}
```

## Package Architecture

### Why Separate Packages?

**Problem**: Destinations are numerous and update frequently. We can't publish a new `@c15t/backend` release every time a destination changes.

**Solution**: Split into two packages with clear responsibilities:

#### `@c15t/backend` (Core Package)
- Defines the `DestinationPlugin` interface (the protocol)
- Provides `DestinationManager` and event processing pipeline
- Exports `DestinationConfig` type and `createDestinationConfig` helper
- Does NOT contain any destination implementations
- Version updates only when core protocol/features change

#### `@c15t/destinations` (Destination Package)
- Contains all destination implementations
- Each destination exports:
  1. A factory function (e.g., `posthogDestination`)
  2. A builder function (e.g., `posthog()`)
  3. Settings type/schema
- Automatically registers destinations with global registry
- Can be versioned independently and updated frequently
- Users can install only specific destinations if needed (future: scoped packages)

### Import Pattern

```typescript
// Backend provides the core system
import { c15tInstance } from '@c15t/backend/v2';

// Destinations come from @c15t/destinations
import { posthog, mixpanel, googleAnalytics } from '@c15t/destinations';

// Custom destinations defined in your app
import { myCustomDestination, myCustom } from './destinations/my-custom';

const instance = c15tInstance({
	analytics: {
		destinations: [
			posthog({ apiKey: 'xxx' }),        // From @c15t/destinations
			mixpanel({ token: 'yyy' }),        // From @c15t/destinations
			myCustom({ apiKey: 'zzz' }),       // From your app
		],
		customDestinations: {
			'my-custom': myCustomDestination,  // Register your factory
		},
	},
});
```

### Auto-Registration Pattern

```typescript
// packages/destinations/src/index.ts

import { destinationRegistry } from '@c15t/backend/v2/analytics';
import { posthogDestination } from './posthog';
import { mixpanelDestination } from './mixpanel';

// Auto-register all built-in destinations when package is imported
destinationRegistry.register('posthog', posthogDestination);
destinationRegistry.register('mixpanel', mixpanelDestination);
// ... etc

// Export builder functions for config creation
export { posthog } from './posthog';
export { mixpanel } from './mixpanel';
// ... etc
```

This way:
- ✅ Backend stays lightweight and rarely needs updates
- ✅ Destinations can be versioned independently
- ✅ Users get automatic destination loading
- ✅ Full type safety maintained
- ✅ Custom destinations integrate seamlessly

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

1. **Create Destination Plugin Interface**
   - Define `DestinationPlugin` interface
   - Define event type interfaces (`TrackEvent`, `PageEvent`, etc.)
   - Define `EventContext` interface
   - Create base destination class

2. **Build Destination Registry**
   - Implement `DestinationRegistry` class
   - Add registration methods
   - Add validation for duplicate types

3. **Implement Runtime Validation**
   - Create Zod schemas for all event types
   - Create settings validation helpers
   - Add comprehensive error messages

### Phase 2: Destination Manager Refactor (Week 1-2)

1. **Refactor DestinationManager**
   - Update to use new plugin interface
   - Add lifecycle management (initialize, destroy)
   - Implement error handling per destination
   - Add retry logic with exponential backoff

2. **GDPR Compliance System**
   - Implement consent filtering per destination
   - Add consent requirement validation
   - Create audit logging for consent decisions

3. **Event Processing Pipeline**
   - Event enrichment hooks
   - Global event filtering
   - Per-destination event filtering
   - Error isolation (one destination failure doesn't affect others)

### Phase 3: Built-in Destinations (Week 2)

1. **Migrate PostHog Destination**
   - Convert from Segment Actions to new plugin interface
   - Add full type safety
   - Add comprehensive tests

2. **Add Common Destinations**
   - Google Analytics 4
   - Mixpanel
   - Amplitude
   - Segment (ironically, as a destination)

3. **Console Destination**
   - For development/debugging
   - Pretty-print events
   - Optional log levels

### Phase 4: Type Safety & DX (Week 2-3)

1. **Destination Config Builder**
   - Create `destinations` export with builder methods
   - Add type inference for each destination
   - Generate comprehensive JSDoc

2. **Validation Error Messages**
   - Human-readable Zod error formatting
   - Helpful hints for common mistakes
   - Link to documentation

3. **Developer Tools**
   - CLI command to validate destination configs
   - Destination testing utilities
   - Mock destinations for testing

### Phase 5: Integration & Examples (Week 3)

1. **Update Examples**
   - Cloudflare Worker example
   - Next.js App Router example
   - Next.js Pages Router example
   - Custom destination example

2. **Documentation**
   - Migration guide from event-sidekick
   - Custom destination tutorial
   - GDPR compliance guide
   - API reference

3. **Testing**
   - Unit tests for all components
   - Integration tests with multiple destinations
   - E2E tests with real APIs (optional)

## GDPR-First Consent Management

### How It's Different from Segment

**Segment approach**: No built-in consent management. Consent is bolted on via middleware or ignored entirely.

**c15t approach**: Consent is a first-class citizen. Every event batch includes current consent state, and the system automatically routes events only to compliant destinations.

### Consent Flow & Integration

```typescript
/**
 * 1. User interacts with cookie banner (frontend)
 */
// When user clicks "Accept Marketing Only"
analytics.updateConsent({
	necessary: true,
	measurement: false,
	marketing: true,      // ← User accepted this
	functionality: false,
	experience: false,
});

// This sends a consent event to backend analytics endpoint
{
	type: 'consent',
	consentType: 'cookie_banner',
	action: 'updated',
	preferences: {
		necessary: true,
		measurement: false,
		marketing: true,
		functionality: false,
		experience: false,
	},
	domain: 'example.com',
	source: 'cookie_banner',
	subjectId: 'user-123',
	metadata: {
		ip: '192.168.1.1',
		userAgent: 'Mozilla/5.0...',
		timestamp: '2025-10-04T12:00:00Z',
		// CMP-specific metadata can go here
		cmpName: 'onetrust',
		consentId: 'consent-abc123'
	}
}

/**
 * 2. Backend processes consent event (dual purpose)
 */
// a) Send to analytics destinations (for tracking user preferences)
//    → PostHog records consent change event
//    → Amplitude logs preference update
//    → etc.

// b) Record in c15t consent management system
//    Backend automatically calls POST /consent/set with:
{
	type: 'cookie_banner',
	domain: 'example.com',
	subjectId: 'user-123',
	preferences: {
		necessary: true,
		measurement: false,
		marketing: true,
		functionality: false,
		experience: false,
	},
	metadata: {
		ip: '192.168.1.1',
		userAgent: 'Mozilla/5.0...',
		source: 'analytics_event',
		cmpName: 'consent',
		consentId: 'consent-abc123'
	}
}

// c) If OneTrust destination is configured, send to Consent too
//    OneTrust can create a destination plugin:
//    → Receives consent events
//    → Syncs back to Consent's platform
//    → Updates Consent's consent records

/**
 * 3. Result: Triple integration
 */
// ✅ Consent event tracked in analytics (PostHog, Mixpanel, etc.)
// ✅ Consent record stored in c15t database (GDPR compliance)
// ✅ CMP platform synced (if CMP destination configured)
// ✅ Audit trail maintained for legal requirements
// ✅ User preferences applied to all future events

/**
 * 2. Subsequent events include consent (frontend)
 */
analytics.track('Product Viewed', {
	productId: 'abc123',
	category: 'shoes',
});

// Payload sent to backend includes consent:
{
	events: [
		{
			type: 'track',
			name: 'Product Viewed',
			properties: { productId: 'abc123' },
			// ... other fields
		}
	],
	consent: {
		necessary: true,
		measurement: false,
		marketing: true,    // ← Current consent state
		functionality: false,
		experience: false,
	}
}

/**
 * 3. Backend filters events per destination
 */
// PostHog (requires measurement) - Event NOT sent
// Meta Pixel (requires marketing) - Event IS sent ✓
// Console (requires necessary) - Event IS sent ✓
```

### Consent-Based Filtering Implementation

```typescript
/**
 * Map event types to required consent purposes
 */
export const EVENT_PURPOSE_MAP: Record<string, keyof AnalyticsConsent> = {
	track: 'measurement',
	page: 'measurement',
	identify: 'measurement',
	group: 'measurement',
	alias: 'measurement',
	consent: 'necessary',  // Consent events always sent (GDPR requirement)
};

/**
 * Filter events based on consent and destination requirements
 * 
 * This runs for EVERY destination before sending events
 */
async function filterEventsByConsent(
	events: AnalyticsEvent[],
	consent: AnalyticsConsent,
	destination: DestinationPlugin
): Promise<AnalyticsEvent[]> {
	// Step 1: Check if destination has required consent
	const requiredConsent = destination.requiredConsent;
	
	// If destination requires consent purposes that aren't granted, filter all events
	for (const purpose of requiredConsent) {
		if (!consent[purpose]) {
			console.log(
				`[${destination.type}] ❌ Blocking all events - missing '${purpose}' consent`
			);
			return [];  // No events sent to this destination
		}
	}
	
	// Step 2: Filter individual events based on their purpose
	const filteredEvents = events.filter((event) => {
		// Get purpose for this event type
		const eventPurpose = EVENT_PURPOSE_MAP[event.type];
		
		// Check if user consented to this purpose
		if (!consent[eventPurpose]) {
			console.log(
				`[${destination.type}] ⚠️  Filtering ${event.type} event - '${eventPurpose}' not granted`
			);
			return false;
		}
		
		return true;
	});
	
	console.log(
		`[${destination.type}] ✓ Sending ${filteredEvents.length}/${events.length} events`
	);
	
	return filteredEvents;
}

/**
 * Example destination configurations with consent requirements
 */
const destinations = [
	// Analytics destinations (need measurement consent)
	{
		type: 'posthog',
		requiredConsent: ['measurement'],
		// Only receives events if user consented to measurement
	},
	{
		type: 'google-analytics',
		requiredConsent: ['measurement'],
	},
	
	// Marketing destinations (need marketing consent)
	{
		type: 'meta-pixel',
		requiredConsent: ['marketing'],
		// Only receives events if user consented to marketing
	},
	{
		type: 'google-ads',
		requiredConsent: ['marketing'],
	},
	
	// Multi-purpose destinations
	{
		type: 'amplitude',
		requiredConsent: ['measurement', 'functionality'],
		// Needs BOTH consents - stricter filtering
	},
	
	// Essential destinations (always on)
	{
		type: 'console',
		requiredConsent: ['necessary'],
		// Necessary consent is always granted
	},
];
```

### CMP Provider Destination Plugins

CMPs can create destination plugins to receive consent events and sync back to their platform:

```typescript
// packages/destinations/src/onetrust/index.ts

/**
 * OneTrust destination - syncs consent events back to OneTrust platform
 */
class OneTrustDestination implements DestinationPlugin<OneTrustSettings> {
	readonly type = 'onetrust';
	readonly version = '1.0.0';
	readonly gdprCompliant = true;
	readonly settingsSchema = OneTrustSettingsSchema;
	readonly requiredConsent = ['necessary'] as const; // Always receives consent events
	
	async initialize(settings: OneTrustSettings): Promise<void> {
		this.apiKey = settings.apiKey;
		this.dataSubjectId = settings.dataSubjectId;
	}
	
	/**
	 * Only handle consent events - ignore other analytics events
	 */
	async consent(event: ConsentEvent, context: EventContext): Promise<void> {
		// Sync consent back to OneTrust platform
		await fetch(`https://privacyportal-cdn.onetrust.com/request/v1/consentreceipts`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				identifier: event.subjectId,
				purposes: Object.entries(event.preferences).map(([purpose, granted]) => ({
					Id: purpose,
					TransactionType: event.action,
					Status: granted ? 'ACTIVE' : 'WITHDRAWN',
				})),
				timestamp: context.timestamp,
			}),
		});
	}
	
	// Don't need to implement track, page, identify, etc.
	// This destination only cares about consent events
}
```

**Usage:**
```typescript
import { c15tInstance } from '@c15t/backend/v2';
import { posthog, onetrust } from '@c15t/destinations';

const instance = c15tInstance({
	analytics: {
		destinations: [
			posthog({ apiKey: 'xxx' }),              // Analytics
			onetrust({ apiKey: 'yyy' }),             // CMP sync
		]
	}
});

// Now consent events automatically:
// 1. Go to PostHog (for analytics)
// 2. Go to c15t database (for compliance)
// 3. Sync back to OneTrust platform (for their records)
```

### Strategic Business Benefit: Multi-CMP Support & Migration Path

**This architecture enables a smooth transition strategy for enterprise customers:**

```typescript
/**
 * SCENARIO 1: New customers (c15t only)
 */
const newCustomer = c15tInstance({
	analytics: {
		destinations: [
			posthog({ apiKey: 'xxx' }),              // Analytics
			consent({ apiKey: 'yyy' }),              // c15t Consent platform
		]
	}
});
// ✅ Simple setup, modern stack, all-in on c15t

/**
 * SCENARIO 2: Enterprise migration (OneTrust → c15t)
 * Big customers currently using OneTrust need a transition period
 */
const enterpriseCustomer = c15tInstance({
	analytics: {
		destinations: [
			posthog({ apiKey: 'xxx' }),              // Analytics
			consent({ apiKey: 'yyy' }),              // c15t Consent (NEW)
			onetrust({ apiKey: 'zzz' }),             // OneTrust (LEGACY)
		]
	}
});
// ✅ Dual-write: Both platforms receive consent events
// ✅ Zero downtime migration
// ✅ Can compare data between platforms
// ✅ Gradual cutover once validated

/**
 * SCENARIO 3: Post-migration (OneTrust deprecated)
 */
const migratedCustomer = c15tInstance({
	analytics: {
		destinations: [
			posthog({ apiKey: 'xxx' }),              // Analytics
			consent({ apiKey: 'yyy' }),              // c15t Consent (primary)
			// onetrust removed! ✓
		]
	}
});
// ✅ Clean migration complete
// ✅ Single source of truth
// ✅ Lower costs (no OneTrust license)
```

**Migration Timeline:**

```
Phase 1: Install c15t with dual-write
├─ Deploy c15t consent platform
├─ Configure both 'consent' and 'onetrust' destinations
├─ All consent events go to BOTH platforms
└─ Verify data parity

Phase 2: Run in parallel (weeks/months)
├─ Build confidence in c15t platform
├─ Train team on c15t admin interface
├─ Migrate internal tools to c15t API
└─ Keep OneTrust as backup

Phase 3: Cutover
├─ Remove 'onetrust' destination from config
├─ Deploy (zero code changes!)
├─ Monitor for 48 hours
└─ Cancel OneTrust subscription

Total downtime: 0 minutes
Risk: Minimal (can re-enable OneTrust instantly)
```

**Business Benefits:**

1. **Zero-Risk Migration**: Both platforms running simultaneously
2. **No Code Changes**: Just configuration changes
3. **Instant Rollback**: Re-enable OneTrust destination if needed
4. **Competitive Advantage**: Support enterprise customers with existing CMPs
5. **Revenue Opportunity**: "We integrate with your OneTrust" → land customer → migrate later
6. **Lower Friction**: Enterprises don't need to rip out OneTrust on day 1
7. **Data Validation**: Compare consent records between platforms during migration
8. **Gradual Training**: Teams learn c15t while OneTrust is still active

**Sales Pitch:**

> "Don't worry about your existing OneTrust investment. c15t works alongside it. 
> We'll dual-write consent events to both platforms during your transition.
> Once you're comfortable, removing OneTrust is a 2-line config change.
> Zero downtime. Zero risk."

### Consent Persistence

```typescript
/**
 * Frontend: Consent persisted in cookies/localStorage
 */
import { getConsent, setConsent } from 'c15t/analytics';

// Get current consent
const currentConsent = getConsent();

// Update consent (also sends consent event to backend)
setConsent({
	necessary: true,
	measurement: true,
	marketing: false,
	functionality: false,
	experience: false,
});

// Consent is automatically included in every event batch
analytics.track('Button Clicked');  // Includes consent!
```

### Real-World Scenario

```typescript
/**
 * User Journey with Consent Changes
 */

// 1. User lands on site - no consent yet (only necessary)
analytics.page('Homepage');
// → Sent to: Console (necessary) only
// → NOT sent to: PostHog, Meta Pixel

// 2. User accepts measurement consent
analytics.updateConsent({
	necessary: true,
	measurement: true,  // ← Just granted
	marketing: false,
	functionality: false,
	experience: false,
});
// → Consent event sent to all destinations

// 3. User views product
analytics.track('Product Viewed', { productId: '123' });
// → Sent to: Console (necessary), PostHog (measurement)
// → NOT sent to: Meta Pixel (needs marketing)

// 4. User accepts marketing consent
analytics.updateConsent({
	necessary: true,
	measurement: true,
	marketing: true,    // ← Just granted
	functionality: false,
	experience: false,
});

// 5. User adds to cart
analytics.track('Product Added', { productId: '123' });
// → Sent to: Console, PostHog, Meta Pixel
// → ALL destinations get this event because user consented
```

### Audit Logging

```typescript
/**
 * Log consent decisions for audit trail
 */
interface ConsentAuditLog {
	timestamp: string;
	eventId: string;
	eventType: string;
	destination: string;
	action: 'sent' | 'filtered';
	reason?: string;
	consent: AnalyticsConsent;
}

// Store in database for compliance reporting
await db.consentAuditLog.create({
	timestamp: new Date().toISOString(),
	eventId: event.messageId,
	eventType: event.type,
	destination: destination.type,
	action: 'filtered',
	reason: 'Missing measurement consent',
	consent: consent,
});
```

## Breaking Changes from Event Sidekick

1. **No Segment Actions Dependency**
   - Custom destinations must implement new `DestinationPlugin` interface
   - Cannot use Segment subscriptions/mappings directly

2. **Settings Validation Required**
   - All destinations must provide Zod schema
   - Runtime validation enforced

3. **Consent-First Design**
   - Events automatically filtered by consent
   - Cannot bypass consent without explicit flag

4. **New Configuration API**
   - Use `destinations.posthog()` instead of string-based config
   - Type inference requires new syntax

## Migration Path

### From Event Sidekick

**Before:**
```typescript
const server = new NextTrackerServerApp({
	debug: false,
	destinations: [
		{
			type: 'posthog',
			enabled: true,
			settings: {
				apiKey: env.POSTHOG_API_KEY,
			},
		},
	],
	sentry: Sentry,
});
```

**After:**
```typescript
import { c15tInstance } from '@c15t/backend/v2';
import { posthog } from '@c15t/destinations';  // Separate package!

const instance = c15tInstance({
	adapter: kyselyAdapter({ /* ... */ }),
	trustedOrigins: ['https://example.com'],
	analytics: {
		destinations: [
			posthog({
				apiKey: env.POSTHOG_API_KEY,
			}),
		],
	},
	logger: {
		level: 'debug',
	},
});

// In route handler
export async function POST(req: NextRequest) {
	return await instance.handler(req);
}
```

## Success Criteria

- [ ] 100% type safety for destination configs
- [ ] Runtime validation for all settings
- [ ] Zero consent violations (audit logs prove compliance)
- [ ] Developer can add custom destination in < 100 lines
- [ ] Migration guide covers all common use cases
- [ ] Performance equal or better than event-sidekick
- [ ] All existing destinations ported
- [ ] Comprehensive test coverage (>80%)

## Future Enhancements

1. **Destination Caching**
   - Cache destination instances across requests
   - Smart invalidation on settings changes

2. **Batch Processing**
   - Batch events to destinations that support it
   - Configurable batch size and flush interval

3. **Rate Limiting**
   - Per-destination rate limits
   - Automatic backoff

4. **Event Transformation**
   - Per-destination event transformers
   - Schema mapping for non-standard APIs

5. **Monitoring Dashboard**
   - Real-time event processing metrics
   - Destination health status
   - Consent analytics

6. **Webhook Destinations**
   - Generic webhook destination
   - Retry logic with dead letter queue
   - Signature verification

## Questions & Decisions

### Q: Should we support Segment Actions as a compatibility layer?
**Decision**: No. Clean break from Segment to simplify architecture and improve type safety.

### Q: How do we handle destination versioning?
**Decision**: Version field in plugin. Breaking changes require new major version. Registry can support multiple versions.

### Q: Should consent be checked at queue time or send time?
**Decision**: Send time. Consent can change between queue and send. Always respect latest consent.

### Q: How do we handle PII scrubbing?
**Decision**: Add optional `scrubPII` function to EventContext. Each destination can implement based on requirements.

### Q: Should destinations be loaded synchronously or asynchronously?
**Decision**: Asynchronously with validation upfront. Fail fast if destination can't be loaded.

## Resources

- [GDPR Consent Requirements](https://gdpr.eu/consent/)
- [Segment Spec](https://segment.com/docs/connections/spec/)
- [PostHog API Docs](https://posthog.com/docs/api)
- [Mixpanel API Docs](https://developer.mixpanel.com/docs)

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-04  
**Author**: c15t Team
