/**
 * Core server destinations for c15t analytics
 *
 * This module provides the first concrete implementations of the DestinationPlugin interface:
 * - PostHog: Production-ready analytics destination for product analytics
 * - Console: Development/debugging destination for local testing
 */

// Re-export DestinationConfig type for proper typing
export type { DestinationConfig } from '@c15t/backend/v2/types';
export type { ConsoleSettings } from './console';
export { ConsoleDestination, createConsoleDestination } from './console';
export type { PostHogSettings } from './posthog';
export { createPostHogDestination, PostHogDestination } from './posthog';

export { PostHogClient } from './posthog/client';

/**
 * Destination registry containing all available destination factories.
 * This registry is used by the DestinationManager to automatically load destinations.
 *
 * Note: This is a placeholder registry. The actual factory functions should be
 * created by the DestinationManager when it loads destinations dynamically.
 */
export const destinationRegistry = {} as const;
