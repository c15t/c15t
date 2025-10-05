/**
 * Core server destinations for c15t analytics
 *
 * This module provides the first concrete implementations of the DestinationPlugin interface:
 * - PostHog: Production-ready analytics destination for product analytics
 * - Console: Development/debugging destination for local testing
 */

export type { ConsoleSettings } from './console';
export { ConsoleDestination, createConsoleDestination } from './console';
export type { PostHogSettings } from './posthog';
export { createPostHogDestination, PostHogDestination } from './posthog';

export { PostHogClient } from './posthog/client';
