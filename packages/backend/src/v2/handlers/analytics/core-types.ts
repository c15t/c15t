/**
 * @fileoverview Core analytics types for c15t backend.
 * These are the base types that destinations must implement.
 */

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
 * Generic destination factory function type.
 */
export type DestinationFactory<TSettings = Record<string, unknown>> = (
	settings: TSettings
) => Promise<AnalyticsDestination>;

/**
 * Core analytics destination interface that all destinations must implement.
 */
export interface AnalyticsDestination {
	readonly type: string;
	sendEvent(event: AnalyticsEvent, consent: AnalyticsConsent): Promise<void>;
	testConnection(): Promise<boolean>;
	getRequiredConsent(): Array<keyof AnalyticsConsent>;
}

/**
 * Base destination configuration interface.
 */
export interface BaseDestinationConfig<TSettings = Record<string, unknown>> {
	type: string;
	enabled: boolean;
	settings: TSettings;
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
	}>;
	/**
	 * Optional custom destination factory registry.
	 * If not provided, destinations will be loaded dynamically from @c15t/destinations.
	 */
	customRegistry?: Record<string, DestinationFactory>;
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

export type ConsoleSettings = {};
