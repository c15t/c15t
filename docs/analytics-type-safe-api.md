# Type-Safe Analytics API Design

This document shows the exact TypeScript implementation for the type-safe analytics system.

## Core Type Definitions

### 1. Event Types

```typescript
// packages/backend/src/v2/handlers/analytics/events.ts

import { z } from 'zod';

/**
 * Base event context shared across all events
 */
export const EventContextSchema = z.object({
	userId: z.string().optional(),
	anonymousId: z.string(),
	sessionId: z.string(),
	timestamp: z.string(),
	messageId: z.string(),
	ip: z.string().optional(),
	userAgent: z.string().optional(),
	locale: z.string().optional(),
	timezone: z.string().optional(),
	page: z
		.object({
			path: z.string(),
			title: z.string(),
			url: z.string(),
			referrer: z.string().optional(),
		})
		.optional(),
});

export type EventContext = z.infer<typeof EventContextSchema>;

/**
 * Track event schema
 */
export const TrackEventSchema = z.object({
	type: z.literal('track'),
	name: z.string().min(1, 'Event name is required'),
	properties: z.record(z.unknown()).default({}),
});

export type TrackEvent = z.infer<typeof TrackEventSchema>;

/**
 * Page event schema
 */
export const PageEventSchema = z.object({
	type: z.literal('page'),
	name: z.string().optional(),
	properties: z.record(z.unknown()).default({}),
});

export type PageEvent = z.infer<typeof PageEventSchema>;

/**
 * Identify event schema
 */
export const IdentifyEventSchema = z.object({
	type: z.literal('identify'),
	traits: z.record(z.unknown()).default({}),
});

export type IdentifyEvent = z.infer<typeof IdentifyEventSchema>;

/**
 * Group event schema
 */
export const GroupEventSchema = z.object({
	type: z.literal('group'),
	groupId: z.string().min(1, 'Group ID is required'),
	traits: z.record(z.unknown()).default({}),
});

export type GroupEvent = z.infer<typeof GroupEventSchema>;

/**
 * Alias event schema
 */
export const AliasEventSchema = z.object({
	type: z.literal('alias'),
	previousId: z.string().min(1, 'Previous ID is required'),
});

export type AliasEvent = z.infer<typeof AliasEventSchema>;

/**
 * Union of all event types
 */
export type AnalyticsEvent =
	| TrackEvent
	| PageEvent
	| IdentifyEvent
	| GroupEvent
	| AliasEvent;

/**
 * Event with context
 */
export interface EventWithContext<TEvent extends AnalyticsEvent = AnalyticsEvent> {
	event: TEvent;
	context: EventContext;
}
```

### 2. Destination Plugin Interface

```typescript
// packages/backend/src/v2/handlers/analytics/destination-plugin.ts

import type { z } from 'zod';
import type { AnalyticsConsent } from './consent';
import type {
	AliasEvent,
	EventContext,
	GroupEvent,
	IdentifyEvent,
	PageEvent,
	TrackEvent,
	AnalyticsEvent,
} from './events';

/**
 * Result of event processing
 */
export interface EventResult {
	success: boolean;
	error?: string;
	duration: number;
}

/**
 * Base destination plugin interface that all destinations must implement
 * 
 * @typeParam TSettings - The validated settings type for this destination
 * 
 * @example
 * ```typescript
 * class PostHogDestination implements DestinationPlugin<PostHogSettings> {
 *   readonly type = 'posthog';
 *   readonly version = '1.0.0';
 *   readonly settingsSchema = PostHogSettingsSchema;
 *   
 *   async initialize(settings: PostHogSettings) {
 *     // Initialize PostHog client
 *   }
 *   
 *   async track(event: TrackEvent, context: EventContext) {
 *     // Send track event to PostHog
 *   }
 * }
 * ```
 */
export interface DestinationPlugin<TSettings = Record<string, unknown>> {
	/**
	 * Unique identifier for this destination type
	 * Must be lowercase kebab-case (e.g., 'posthog', 'google-analytics')
	 */
	readonly type: string;

	/**
	 * Semantic version of this destination plugin
	 */
	readonly version: string;

	/**
	 * Whether this destination is GDPR compliant
	 * If false, will show warning in logs
	 */
	readonly gdprCompliant: boolean;

	/**
	 * Zod schema for validating settings
	 * Settings will be validated at initialization time
	 */
	readonly settingsSchema: z.ZodType<TSettings>;

	/**
	 * Required consent purposes for this destination
	 * Events will only be sent if all required purposes are granted
	 * 
	 * @example
	 * ```typescript
	 * // Require both measurement and marketing consent
	 * readonly requiredConsent = ['measurement', 'marketing'] as const;
	 * ```
	 */
	readonly requiredConsent: ReadonlyArray<keyof AnalyticsConsent>;

	/**
	 * Initialize the destination with validated settings
	 * 
	 * @param settings - Validated settings for this destination
	 * @throws {Error} When initialization fails (e.g., invalid API key)
	 * 
	 * @example
	 * ```typescript
	 * async initialize(settings: PostHogSettings) {
	 *   this.client = new PostHog(settings.apiKey, {
	 *     host: settings.host
	 *   });
	 * }
	 * ```
	 */
	initialize(settings: TSettings): Promise<void>;

	/**
	 * Test the connection to the destination
	 * Called during health checks and validation
	 * 
	 * @returns Whether the connection is successful
	 * 
	 * @example
	 * ```typescript
	 * async testConnection(): Promise<boolean> {
	 *   try {
	 *     await this.client.capture('test');
	 *     return true;
	 *   } catch {
	 *     return false;
	 *   }
	 * }
	 * ```
	 */
	testConnection(): Promise<boolean>;

	/**
	 * Handle a track event
	 * Only called if consent requirements are met
	 * 
	 * @param event - The track event to process
	 * @param context - Additional context about the event
	 * 
	 * @throws {Error} When event processing fails
	 */
	track?(event: TrackEvent, context: EventContext): Promise<void>;

	/**
	 * Handle a page event
	 * Only called if consent requirements are met
	 */
	page?(event: PageEvent, context: EventContext): Promise<void>;

	/**
	 * Handle an identify event
	 * Only called if consent requirements are met
	 */
	identify?(event: IdentifyEvent, context: EventContext): Promise<void>;

	/**
	 * Handle a group event
	 * Only called if consent requirements are met
	 */
	group?(event: GroupEvent, context: EventContext): Promise<void>;

	/**
	 * Handle an alias event
	 * Only called if consent requirements are met
	 */
	alias?(event: AliasEvent, context: EventContext): Promise<void>;

	/**
	 * Hook called before processing any event
	 * Can modify the event or throw to prevent processing
	 * 
	 * @param event - The event to process
	 * @returns Modified event or original event
	 */
	onBeforeEvent?(event: AnalyticsEvent): Promise<AnalyticsEvent>;

	/**
	 * Hook called after successfully processing an event
	 * 
	 * @param event - The processed event
	 * @param result - Result of the processing
	 */
	onAfterEvent?(event: AnalyticsEvent, result: EventResult): Promise<void>;

	/**
	 * Hook called when event processing fails
	 * 
	 * @param error - The error that occurred
	 * @param event - The event that failed
	 */
	onError?(error: Error, event: AnalyticsEvent): Promise<void>;

	/**
	 * Cleanup resources when destination is destroyed
	 */
	destroy?(): Promise<void>;
}

/**
 * Factory function for creating destination instances
 * 
 * @typeParam TSettings - The settings type for this destination
 * 
 * @example
 * ```typescript
 * export const posthogDestination: DestinationFactory<PostHogSettings> = 
 *   async (settings) => {
 *     const destination = new PostHogDestination();
 *     await destination.initialize(settings);
 *     return destination;
 *   };
 * ```
 */
export type DestinationFactory<TSettings = Record<string, unknown>> = (
	settings: TSettings
) => Promise<DestinationPlugin<TSettings>>;
```

### 3. Type-Safe Configuration (Backend)

```typescript
// packages/backend/src/v2/types/analytics.ts

import type { AnalyticsConsent } from './consent';

/**
 * Base destination configuration
 * This is the only destination-related type exported from backend
 */
export interface DestinationConfig<TSettings = Record<string, unknown>> {
	type: string;
	enabled: boolean;
	settings: TSettings;
	/**
	 * Override default required consent for this specific configuration
	 * If not provided, uses the destination plugin's default
	 */
	requiredConsent?: ReadonlyArray<keyof AnalyticsConsent>;
}

/**
 * Helper to create a type-safe destination config
 * Used by @c15t/destinations package to create builder functions
 * 
 * @param type - Destination type identifier
 * @param settings - Destination settings
 * @param enabled - Whether destination is enabled (default: true)
 * @returns Type-safe destination configuration
 * 
 * @example
 * ```typescript
 * // In @c15t/destinations package
 * export function posthog(
 *   settings: PostHogSettings,
 *   enabled = true
 * ): DestinationConfig<PostHogSettings> {
 *   return createDestinationConfig('posthog', settings, enabled);
 * }
 * ```
 */
export function createDestinationConfig<TSettings>(
	type: string,
	settings: TSettings,
	enabled = true
): DestinationConfig<TSettings> {
	return {
		type,
		enabled,
		settings,
	};
}

/**
 * Infer settings type from a destination plugin
 */
export type InferSettings<TPlugin> = TPlugin extends DestinationPlugin<infer TSettings>
	? TSettings
	: never;

/**
 * Infer destination config from a destination factory
 */
export type InferDestinationConfig<TFactory> = 
	TFactory extends DestinationFactory<infer TSettings>
		? DestinationConfig<TSettings>
		: never;
```

### 3b. Destination Builders (@c15t/destinations package)

```typescript
// packages/destinations/src/posthog/index.ts

import { createDestinationConfig, type DestinationConfig } from '@c15t/backend/v2/types';
import { z } from 'zod';

/**
 * PostHog settings schema
 */
export const PostHogSettingsSchema = z.object({
	apiKey: z.string().min(1, 'API key is required'),
	host: z.string().url().optional().default('https://app.posthog.com'),
});

export type PostHogSettings = z.infer<typeof PostHogSettingsSchema>;

/**
 * PostHog destination factory
 * (implementation details...)
 */
export const posthogDestination: DestinationFactory<PostHogSettings> = async (settings) => {
	// ... implementation
};

/**
 * PostHog destination builder function
 * Exported from @c15t/destinations for user imports
 * 
 * @example
 * ```typescript
 * import { posthog } from '@c15t/destinations';
 * 
 * const config = posthog({
 *   apiKey: 'phc_xxx',
 *   host: 'https://app.posthog.com' // optional
 * });
 * ```
 */
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
import { googleAnalyticsDestination } from './google-analytics';
import { consoleDestination } from './console';

// Auto-register all destinations when package is imported
destinationRegistry.register('posthog', posthogDestination);
destinationRegistry.register('mixpanel', mixpanelDestination);
destinationRegistry.register('google-analytics', googleAnalyticsDestination);
destinationRegistry.register('console', consoleDestination);

// Export builder functions for users
export { posthog } from './posthog';
export { mixpanel } from './mixpanel';
export { googleAnalytics } from './google-analytics';
export { console as consoleLog } from './console';

// Export types
export type { PostHogSettings } from './posthog';
export type { MixpanelSettings } from './mixpanel';
export type { GoogleAnalyticsSettings } from './google-analytics';
export type { ConsoleSettings } from './console';
```

### 4. Analytics Options

```typescript
// packages/backend/src/v2/types/analytics-options.ts

import type { AnalyticsEvent } from '../handlers/analytics/events';
import type {
	DestinationConfig,
	DestinationFactory,
} from '../handlers/analytics/config-builder';
import type { EventContext } from '../handlers/analytics/destination-plugin';

/**
 * Analytics system configuration
 * 
 * @example
 * ```typescript
 * const analytics: AnalyticsOptions = {
 *   enabled: true,
 *   destinations: [
 *     destinations.posthog({ apiKey: 'xxx' }),
 *     destinations.custom('my-dest', { key: 'yyy' })
 *   ],
 *   customDestinations: {
 *     'my-dest': myDestinationFactory
 *   }
 * };
 * ```
 */
export interface AnalyticsOptions {
	/**
	 * Enable or disable the analytics system globally
	 * When disabled, no events will be processed
	 * 
	 * @default true
	 */
	enabled?: boolean;

	/**
	 * Array of destination configurations
	 * Each destination will receive events based on consent
	 * 
	 * Use the `destinations` builder for type safety:
	 * ```typescript
	 * destinations: [
	 *   destinations.posthog({ apiKey: 'xxx' }),
	 *   destinations.mixpanel({ projectToken: 'yyy' })
	 * ]
	 * ```
	 */
	destinations: Array<DestinationConfig<any>>;

	/**
	 * Custom destination factories for extending built-in destinations
	 * 
	 * Maps destination type to factory function
	 * 
	 * @example
	 * ```typescript
	 * customDestinations: {
	 *   'my-analytics': myAnalyticsFactory,
	 *   'custom-tracker': customTrackerFactory
	 * }
	 * ```
	 */
	customDestinations?: Record<string, DestinationFactory<any>>;

	/**
	 * Global event enrichment function
	 * Called before sending events to any destination
	 * 
	 * @param event - The event to enrich
	 * @param context - Event context
	 * @returns Enriched event (or original if no changes)
	 * 
	 * @example
	 * ```typescript
	 * enrichEvent: async (event, context) => {
	 *   return {
	 *     ...event,
	 *     properties: {
	 *       ...event.properties,
	 *       environment: process.env.NODE_ENV,
	 *       appVersion: process.env.APP_VERSION
	 *     }
	 *   };
	 * }
	 * ```
	 */
	enrichEvent?: (
		event: AnalyticsEvent,
		context: EventContext
	) => Promise<AnalyticsEvent>;

	/**
	 * Global event filter function
	 * Return false to prevent event from being processed by any destination
	 * 
	 * @param event - The event to filter
	 * @param context - Event context
	 * @returns Whether to process this event
	 * 
	 * @example
	 * ```typescript
	 * filterEvent: async (event, context) => {
	 *   // Don't send internal test events
	 *   if (event.properties?.test === true) {
	 *     return false;
	 *   }
	 *   // Don't send events from bots
	 *   if (context.userAgent?.includes('bot')) {
	 *     return false;
	 *   }
	 *   return true;
	 * }
	 * ```
	 */
	filterEvent?: (
		event: AnalyticsEvent,
		context: EventContext
	) => Promise<boolean>;

	/**
	 * Retry configuration for failed events
	 * 
	 * @default { maxAttempts: 3, backoff: 'exponential' }
	 */
	retry?: {
		/**
		 * Maximum number of retry attempts
		 * @default 3
		 */
		maxAttempts?: number;

		/**
		 * Backoff strategy
		 * - 'exponential': 1s, 2s, 4s, 8s, ...
		 * - 'linear': 1s, 1s, 1s, ...
		 * - 'fixed': Use initialDelay for all retries
		 * 
		 * @default 'exponential'
		 */
		backoff?: 'exponential' | 'linear' | 'fixed';

		/**
		 * Initial delay before first retry in milliseconds
		 * @default 1000
		 */
		initialDelay?: number;

		/**
		 * Maximum delay between retries in milliseconds
		 * @default 30000 (30 seconds)
		 */
		maxDelay?: number;
	};

	/**
	 * Batch processing configuration
	 * Groups events together for efficient processing
	 * 
	 * @default { enabled: false }
	 */
	batch?: {
		/**
		 * Enable batch processing
		 * @default false
		 */
		enabled?: boolean;

		/**
		 * Maximum number of events per batch
		 * @default 100
		 */
		maxSize?: number;

		/**
		 * Maximum time to wait before flushing batch in milliseconds
		 * @default 10000 (10 seconds)
		 */
		flushInterval?: number;
	};
}
```

## Usage Examples

### Basic Setup

```typescript
import { c15tInstance } from '@c15t/backend/v2';
import { posthog } from '@c15t/destinations';

const instance = c15tInstance({
	adapter: myAdapter,
	trustedOrigins: ['https://example.com'],
	analytics: {
		destinations: [
			posthog({
				apiKey: 'phc_xxx',
			}),
		],
	},
});
```

### Advanced Setup with Custom Destination

```typescript
import { c15tInstance } from '@c15t/backend/v2';
import { posthog, mixpanel } from '@c15t/destinations';
import { myCustomDestination, myCustom } from './destinations/my-custom';

const instance = c15tInstance({
	adapter: myAdapter,
	trustedOrigins: ['https://example.com'],
	analytics: {
		destinations: [
			// Built-in destinations from @c15t/destinations
			posthog({
				apiKey: process.env.POSTHOG_API_KEY!,
				host: 'https://app.posthog.com',
			}),
			mixpanel({
				projectToken: process.env.MIXPANEL_TOKEN!,
			}),
			
			// Custom destination builder from your app
			myCustom({
				apiKey: process.env.MY_API_KEY!,
				endpoint: 'https://api.myanalytics.com',
				environment: process.env.NODE_ENV,
			}),
		],
		
		// Register custom destination factory
		customDestinations: {
			'my-custom': myCustomDestination,
		},
		
		// Enrich all events
		enrichEvent: async (event, context) => {
			if (event.type === 'track') {
				return {
					...event,
					properties: {
						...event.properties,
						environment: process.env.NODE_ENV,
						version: process.env.APP_VERSION,
						region: process.env.AWS_REGION,
					},
				};
			}
			return event;
		},
		
		// Filter events
		filterEvent: async (event, context) => {
			// Don't send test events
			if ('test' in (event.properties ?? {}) && event.properties.test === true) {
				return false;
			}
			// Don't send events from internal IPs
			if (context.ip?.startsWith('10.')) {
				return false;
			}
			return true;
		},
		
		// Configure retry behavior
		retry: {
			maxAttempts: 5,
			backoff: 'exponential',
			initialDelay: 1000,
			maxDelay: 60000,
		},
	},
});
```

### Type Inference in Action

```typescript
import { posthog } from '@c15t/destinations';

// ✅ Type-safe: TypeScript knows the exact shape
const config = posthog({
	apiKey: 'phc_xxx',
	host: 'https://app.posthog.com',
});

// ❌ Type error: unknown property
const badConfig = posthog({
	apiKey: 'phc_xxx',
	wrongField: 'value', // Error: Object literal may only specify known properties
});

// ✅ Custom destination builder with full type inference
import { myCustom } from './destinations/my-custom';

const customConfig = myCustom({
	apiKey: 'xxx',
	endpoint: 'https://api.example.com',
	retries: 3,
});
// TypeScript infers: DestinationConfig<{ apiKey: string; endpoint: string; retries: number; }>
```

## Implementation Checklist

- [ ] Create event type definitions with Zod schemas
- [ ] Implement `DestinationPlugin` interface
- [ ] Build `DestinationConfigBuilder` with type inference
- [ ] Create `destinations` export with builder methods
- [ ] Implement runtime validation for all settings
- [ ] Add JSDoc comments with examples
- [ ] Create comprehensive tests for type inference
- [ ] Generate API documentation
- [ ] Create migration guide with examples
- [ ] Update existing destinations to new interface

---

**Next Steps**: Start with Phase 1 implementation - create the core interfaces and schemas.
