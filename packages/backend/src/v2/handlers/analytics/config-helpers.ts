/**
 * Fully dynamic analytics configuration helpers
 * No hardcoded destination types - everything is inferred at runtime
 */

import type { AnalyticsConfig, DestinationConfig } from './core-types';

/**
 * Type-safe destination configuration builder
 *
 * @param type - The destination type (any string)
 * @param enabled - Whether the destination is enabled
 * @param settings - The destination-specific settings
 * @returns A properly typed destination configuration
 *
 * @example
 * ```ts
 * const posthogConfig = createDestinationConfig('posthog', true, {
 *   apiKey: 'ph_xxx',
 *   host: 'https://app.posthog.com'
 * });
 *
 * const customConfig = createDestinationConfig('my-custom-destination', true, {
 *   customSetting: 'value'
 * });
 * ```
 */
export function createDestinationConfig(
	type: string,
	enabled: boolean,
	settings: Record<string, unknown> = {}
): DestinationConfig {
	return {
		type,
		enabled,
		settings,
	};
}

/**
 * Type-safe analytics configuration builder
 *
 * @param destinations - Array of destination configurations
 * @returns A properly typed analytics configuration
 *
 * @example
 * ```ts
 * const analyticsConfig = createAnalyticsConfig([
 *   createDestinationConfig('posthog', true, { apiKey: 'ph_xxx' }),
 *   createDestinationConfig('console', true, {}),
 *   createDestinationConfig('my-custom-destination', true, { custom: 'value' })
 * ]);
 * ```
 */
export function createAnalyticsConfig(
	destinations: DestinationConfig[]
): AnalyticsConfig {
	return {
		destinations,
	};
}

/**
 * Runtime validation for destination settings
 * This is a generic validator that checks basic structure
 * Individual destinations can have their own validation
 *
 * @param settings - The settings to validate
 * @returns True if settings are a valid object
 *
 * @example
 * ```ts
 * const isValid = validateDestinationSettings({ apiKey: 'ph_xxx' });
 * if (!isValid) {
 *   throw new Error('Invalid destination settings');
 * }
 * ```
 */
export function validateDestinationSettings(
	settings: unknown
): settings is Record<string, unknown> {
	return (
		typeof settings === 'object' &&
		settings !== null &&
		!Array.isArray(settings)
	);
}

/**
 * Validates an entire analytics configuration
 *
 * @param config - The analytics configuration to validate
 * @returns True if the configuration is valid
 *
 * @example
 * ```ts
 * const isValid = validateAnalyticsConfig(analyticsConfig);
 * if (!isValid) {
 *   throw new Error('Invalid analytics configuration');
 * }
 * ```
 */
export function validateAnalyticsConfig(config: AnalyticsConfig): boolean {
	if (!Array.isArray(config.destinations)) {
		return false;
	}

	return config.destinations.every(
		(dest) =>
			typeof dest.type === 'string' &&
			dest.type.length > 0 &&
			typeof dest.enabled === 'boolean' &&
			validateDestinationSettings(dest.settings)
	);
}

/**
 * Helper to create a console destination configuration
 * Console destination has no required settings
 *
 * @param enabled - Whether the destination is enabled
 * @returns Console destination configuration
 *
 * @example
 * ```ts
 * const console = createConsoleDestination(true);
 * ```
 */
export function createConsoleDestination(enabled = true): DestinationConfig {
	return createDestinationConfig('console', enabled, {});
}

/**
 * Helper to create a PostHog destination configuration
 *
 * @param apiKey - PostHog API key
 * @param host - Optional PostHog host (defaults to app.posthog.com)
 * @param enabled - Whether the destination is enabled
 * @returns PostHog destination configuration
 *
 * @example
 * ```ts
 * const posthog = createPostHogDestination('ph_xxx', 'https://app.posthog.com', true);
 * ```
 */
export function createPostHogDestination(
	apiKey: string,
	host?: string,
	enabled = true
): DestinationConfig {
	return createDestinationConfig('posthog', enabled, { apiKey, host });
}

/**
 * Helper to create a Mixpanel destination configuration
 *
 * @param token - Mixpanel project token
 * @param projectId - Optional Mixpanel project ID
 * @param enabled - Whether the destination is enabled
 * @returns Mixpanel destination configuration
 *
 * @example
 * ```ts
 * const mixpanel = createMixpanelDestination('mp_xxx', 'project_id', true);
 * ```
 */
export function createMixpanelDestination(
	token: string,
	projectId?: string,
	enabled = true
): DestinationConfig {
	return createDestinationConfig('mixpanel', enabled, { token, projectId });
}

/**
 * Helper to create a Google Analytics destination configuration
 *
 * @param measurementId - Google Analytics measurement ID
 * @param apiSecret - Optional Google Analytics API secret
 * @param enabled - Whether the destination is enabled
 * @returns Google Analytics destination configuration
 *
 * @example
 * ```ts
 * const ga = createGoogleAnalyticsDestination('G-XXXXXXXXXX', 'secret', true);
 * ```
 */
export function createGoogleAnalyticsDestination(
	measurementId: string,
	apiSecret?: string,
	enabled = true
): DestinationConfig {
	return createDestinationConfig('google-analytics', enabled, {
		measurementId,
		apiSecret,
	});
}

/**
 * Generic helper to create any destination configuration
 * This is the most flexible option for custom destinations
 *
 * @param type - The destination type
 * @param settings - The destination settings
 * @param enabled - Whether the destination is enabled
 * @returns Destination configuration
 *
 * @example
 * ```ts
 * const custom = createCustomDestination('my-destination', {
 *   apiKey: 'xxx',
 *   customSetting: 'value'
 * }, true);
 * ```
 */
export function createCustomDestination(
	type: string,
	settings: Record<string, unknown>,
	enabled = true
): DestinationConfig {
	return createDestinationConfig(type, enabled, settings);
}
