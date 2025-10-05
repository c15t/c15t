/**
 * Dynamic type declarations for @c15t/destinations peer dependency
 * This system infers types without hardcoding specific destinations
 */

declare module '@c15t/destinations' {
	import type { DestinationFactory } from '../handlers/analytics/core-types';

	/**
	 * Dynamic registry of destination factories
	 * Keys are destination types, values are factory functions
	 */
	export const destinationRegistry: Record<string, DestinationFactory>;

	/**
	 * Individual destination factory functions
	 * These are dynamically discovered at runtime
	 */
	export const createConsoleDestination: DestinationFactory;
	export const createPostHogDestination: DestinationFactory;
	export const createMixpanelDestination: DestinationFactory;
	export const createGoogleAnalyticsDestination: DestinationFactory;

	/**
	 * Default destination registry with all built-in destinations
	 */
	export { default as defaultDestinationRegistry } from './registry-default';

	/**
	 * Type definitions for destination settings
	 */
	export type {
		AnalyticsConfig,
		AnalyticsConsent,
		AnalyticsDestination,
		AnalyticsEvent,
		DestinationConfig,
		DestinationFactory,
		PostHogSettings,
		MixpanelSettings,
		GoogleAnalyticsSettings,
		ConsoleSettings,
	} from './types';
}
