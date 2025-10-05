/**
 * @c15t/destinations - Core server destinations for analytics
 *
 * This package provides concrete implementations of the DestinationPlugin interface
 * for sending analytics events to various destinations.
 *
 * ## Available Destinations
 *
 * - **PostHog**: Production-ready analytics destination for product analytics
 * - **Console**: Development/debugging destination for local testing
 *
 * ## Usage
 *
 * ```typescript
 * import { PostHogDestination, ConsoleDestination } from '@c15t/destinations';
 *
 * // Create PostHog destination
 * const posthog = new PostHogDestination(logger);
 * await posthog.initialize({
 *   apiKey: 'your-api-key',
 *   host: 'https://app.posthog.com',
 * });
 *
 * // Create Console destination for debugging
 * const console = new ConsoleDestination(logger);
 * await console.initialize({
 *   logLevel: 'debug',
 *   includeContext: true,
 * });
 * ```
 */

// Re-export types from backend for convenience
export type {
	AliasEvent,
	AnalyticsEvent,
	ConsentEvent,
	ConsentPurpose,
	DestinationPlugin,
	EventContext,
	GroupEvent,
	IdentifyEvent,
	PageEvent,
	TrackEvent,
} from '@c15t/backend/v2';

export type {
	ConsoleSettings,
	DestinationConfig,
	PostHogSettings,
} from './destinations';
// Export destination classes and factory functions
// Export destination registry for automatic loading
export {
	ConsoleDestination,
	createConsoleDestination,
	createPostHogDestination,
	destinationRegistry,
	PostHogClient,
	PostHogDestination,
} from './destinations';
