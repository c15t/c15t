/**
 * @fileoverview Core analytics types for c15t backend.
 * These are the base types that destinations must implement.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Analytics consent configuration.
 */
export interface AnalyticsConsent {
	necessary: boolean;
	measurement: boolean;
	marketing: boolean;
	functionality: boolean;
	experience: boolean;
}

/**
 * Consent purposes for analytics events.
 * Maps to GDPR consent categories for granular control.
 */
export type ConsentPurpose =
	| 'necessary'
	| 'measurement'
	| 'marketing'
	| 'functionality'
	| 'experience';

/**
 * Event context containing session, user, and consent data.
 * Used by destinations to understand the context of events.
 */
export interface EventContext {
	/** Session data */
	sessionId: string;
	sessionStart: Date;

	/** User data */
	userId?: string;
	anonymousId?: string;

	/** Consent state */
	consent: AnalyticsConsent;

	/** Request context */
	userAgent?: string;
	ip?: string;
	referrer?: string;

	/** Custom context */
	custom?: Record<string, unknown>;
}

/**
 * Base analytics event interface.
 */
export interface AnalyticsEvent {
	readonly type: string;
	readonly name?: string;
	readonly userId?: string;
	readonly anonymousId?: string;
	readonly sessionId?: string;
	readonly timestamp: string;
	readonly messageId?: string;
	readonly properties?: Record<string, unknown>;
	readonly traits?: Record<string, unknown>;
	readonly context?: Record<string, unknown>;
}

/**
 * Specific event types for destinations.
 */
export interface TrackEvent extends AnalyticsEvent {
	type: 'track';
	name: string;
	properties: Record<string, unknown>;
}

export interface PageEvent extends AnalyticsEvent {
	type: 'page';
	name?: string;
	properties: Record<string, unknown>;
}

export interface IdentifyEvent extends AnalyticsEvent {
	type: 'identify';
	traits: Record<string, unknown>;
}

export interface GroupEvent extends AnalyticsEvent {
	type: 'group';
	groupId: string;
	traits: Record<string, unknown>;
}

export interface AliasEvent extends AnalyticsEvent {
	type: 'alias';
	properties: Record<string, unknown>;
}

export interface ConsentEvent extends AnalyticsEvent {
	type: 'consent';
	properties: {
		action: 'granted' | 'revoked' | 'updated';
		source:
			| 'banner'
			| 'api'
			| 'consent-dashboard'
			| 'privacy-settings'
			| string;
		previousConsent?: AnalyticsConsent;
		[key: string]: unknown;
	};
}

/**
 * Generic type for specific analytics events.
 * @typeParam T - The event type ('track', 'page', 'identify', 'group', 'alias', 'consent')
 */
export type SpecificAnalyticsEvent<
	T extends AnalyticsEvent['type'] = AnalyticsEvent['type'],
> = T extends 'track'
	? TrackEvent
	: T extends 'page'
		? PageEvent
		: T extends 'identify'
			? IdentifyEvent
			: T extends 'group'
				? GroupEvent
				: T extends 'alias'
					? AliasEvent
					: T extends 'consent'
						? ConsentEvent
						: never;

/**
 * Union type for all specific event types.
 */
export type AnySpecificAnalyticsEvent =
	| TrackEvent
	| PageEvent
	| IdentifyEvent
	| GroupEvent
	| AliasEvent
	| ConsentEvent;

/**
 * Event result for lifecycle hooks.
 */
export interface EventResult {
	success: boolean;
	error?: Error;
	destination: string;
	timestamp: Date;
}

/**
 * Generic destination factory function type.
 */

export type DestinationFactory<TSettings = Record<string, unknown>> = (
	settings: TSettings
) => Promise<DestinationPlugin<TSettings>>;

/**
 * Core destination plugin interface that all destinations must implement.
 * Uses Standard Schema to support any validation library (Zod, ArkType, Valibot, etc.)
 */
export interface DestinationPlugin<TSettings = Record<string, unknown>> {
	/** Core identification */
	readonly type: string;
	readonly version: string;

	/** Metadata (for UI/discovery) */
	readonly name: string; // 'Meta Pixel' (human-readable)
	readonly description: string; // 'Facebook advertising and analytics'
	readonly category:
		| 'analytics'
		| 'marketing'
		| 'crm'
		| 'error-tracking'
		| 'consent-management'
		| 'other';
	readonly homepage?: string; // 'https://developers.facebook.com'
	readonly icon?: string; // Icon URL for admin UI
	readonly author?: string; // '@c15t/team' or community contributor

	/** Compliance */
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
	 * Events will only be sent if user has granted these consent purposes
	 */
	readonly requiredConsent: ReadonlyArray<ConsentPurpose>;

	/** Lifecycle methods */
	initialize(settings: TSettings): Promise<void>;
	testConnection(): Promise<boolean>;

	/** Event handlers */
	track?(event: TrackEvent, context: EventContext): Promise<void>;
	page?(event: PageEvent, context: EventContext): Promise<void>;
	identify?(event: IdentifyEvent, context: EventContext): Promise<void>;
	group?(event: GroupEvent, context: EventContext): Promise<void>;
	alias?(event: AliasEvent, context: EventContext): Promise<void>;
	consent?(event: ConsentEvent, context: EventContext): Promise<void>;

	/** Lifecycle hooks */
	onBeforeEvent?(
		event: AnySpecificAnalyticsEvent
	): Promise<AnySpecificAnalyticsEvent>;
	onAfterEvent?(
		event: AnySpecificAnalyticsEvent,
		result: EventResult
	): Promise<void>;
	onError?(error: Error, event: AnySpecificAnalyticsEvent): Promise<void>;
	destroy?(): Promise<void>;

	/** Script generation for client-side destinations */
	generateScript?(
		settings: TSettings,
		consent: AnalyticsConsent
	): Script | Script[] | null;
}

/**
 * Script interface for client-side destinations.
 */
export interface Script {
	type: 'script' | 'inline';
	src?: string;
	content?: string;
	async?: boolean;
	defer?: boolean;
	attributes?: Record<string, string>;
}

/**
 * Enhanced script interface for universal destinations.
 * Supports more advanced script loading patterns and consent management.
 */
export interface UniversalScript extends Script {
	/** Script loading strategy */
	strategy?: 'eager' | 'lazy' | 'consent-based';
	/** Required consent purposes for this script to load */
	requiredConsent?: ReadonlyArray<ConsentPurpose>;
	/** Script priority for loading order */
	priority?: 'high' | 'normal' | 'low';
	/** Whether this script should be loaded only once */
	loadOnce?: boolean;
	/** Custom conditions for script loading */
	loadCondition?: (consent: AnalyticsConsent) => boolean;
}

/**
 * Universal destination plugin interface that extends DestinationPlugin
 * to support both server-side event processing and client-side script generation.
 *
 * This interface enables destinations to provide a unified configuration
 * that controls both server-side analytics and client-side tracking scripts.
 */
export interface UniversalDestinationPlugin<TSettings = Record<string, unknown>>
	extends DestinationPlugin<TSettings> {
	/**
	 * Generate client-side scripts for this destination.
	 * This method is required for universal destinations.
	 *
	 * @param settings - Destination settings
	 * @param consent - Current consent state
	 * @returns Script or array of scripts to inject into the page, or null if no scripts needed
	 *
	 * @example
	 * ```typescript
	 * generateScript(settings, consent) {
	 *   if (!consent.marketing) return null;
	 *
	 *   return {
	 *     type: 'script',
	 *     src: 'https://connect.facebook.net/en_US/fbevents.js',
	 *     async: true,
	 *     strategy: 'consent-based',
	 *     requiredConsent: ['marketing'],
	 *     priority: 'high'
	 *   };
	 * }
	 * ```
	 */
	generateScript(
		settings: TSettings,
		consent: AnalyticsConsent
	): UniversalScript | UniversalScript[] | null;

	/**
	 * Get script dependencies for this destination.
	 * Used to ensure proper loading order of related scripts.
	 *
	 * @param settings - Destination settings
	 * @returns Array of script identifiers this destination depends on
	 */
	getScriptDependencies?(settings: TSettings): string[];

	/**
	 * Validate script configuration for this destination.
	 * Called before script generation to ensure settings are valid for client-side use.
	 *
	 * @param settings - Destination settings
	 * @returns Promise resolving to true if settings are valid for script generation
	 */
	validateScriptSettings?(settings: TSettings): Promise<boolean>;
}

/**
 * Type guard to check if a destination plugin is a universal destination.
 *
 * @param plugin - Destination plugin to check
 * @returns True if the plugin implements UniversalDestinationPlugin
 */
export function isUniversalDestination(
	plugin: DestinationPlugin
): plugin is UniversalDestinationPlugin {
	return (
		'generateScript' in plugin && typeof plugin.generateScript === 'function'
	);
}

/**
 * Utility type to extract settings type from a destination plugin.
 */
export type DestinationSettings<T extends DestinationPlugin> =
	T extends DestinationPlugin<infer S> ? S : never;

/**
 * Utility type to extract settings type from a universal destination plugin.
 */
export type UniversalDestinationSettings<T extends UniversalDestinationPlugin> =
	T extends UniversalDestinationPlugin<infer S> ? S : never;

/**
 * Base destination configuration interface.
 */
export interface BaseDestinationConfig<TSettings = Record<string, unknown>> {
	type: string;
	enabled: boolean;
	settings: TSettings;
	requiredConsent?: ReadonlyArray<ConsentPurpose>;
}

/**
 * Generic destination configuration type.
 */
export type DestinationConfig<TSettings = Record<string, unknown>> =
	BaseDestinationConfig<TSettings>;

/**
 * Analytics configuration interface.
 */
export interface AnalyticsConfig {
	destinations: Array<{
		type: string;
		enabled: boolean;
		settings: Record<string, unknown>;
		requiredConsent?: ReadonlyArray<ConsentPurpose>;
	}>;
	/**
	 * Optional custom destination factory registry.
	 * If not provided, destinations will be loaded dynamically from @c15t/destinations.
	 */
	customRegistry?: Record<string, DestinationFactory>;
}

/**
 * Main c15t instance configuration options.
 */
export interface C15TOptions {
	analytics?: {
		/** Whether analytics is enabled */
		enabled?: boolean;
		/** Destinations configured via code */
		destinations?: DestinationConfig[];
		/** Whether to load destinations from database */
		loadFromDatabase?: boolean;
		/** Organization ID for multi-tenant setups */
		organizationId?: string;
		/** Environment (production, staging, development) */
		environment?: string;
		/** Custom destination registry */
		customDestinations?: Record<string, DestinationFactory>;
		/** Global event enrichment function */
		enrichEvent?: (
			event: SpecificAnalyticsEvent,
			context: EventContext
		) => Promise<SpecificAnalyticsEvent>;
		/** Global event filter function */
		filterEvent?: (
			event: SpecificAnalyticsEvent,
			context: EventContext
		) => Promise<boolean>;
	};
}

/**
 * Common destination settings types.
 */
export interface PostHogSettings {
	apiKey: string;
	host?: string;
}

export interface MixpanelSettings {
	projectToken: string;
	apiSecret?: string;
}

export interface GoogleAnalyticsSettings {
	measurementId: string;
	apiSecret?: string;
}

export interface ConsoleSettings {
	logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
