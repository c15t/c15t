'use client';

/**
 * @packageDocumentation
 * Analytics utility functions.
 *
 * @remarks
 * This file contains utility functions for analytics functionality.
 * The main analytics hooks are now located in use-analytics.ts.
 */

/**
 * Clears analytics cache (no-op since analytics is integrated into store).
 *
 * @remarks
 * This function is provided for compatibility but does nothing
 * since analytics is now integrated into the main store.
 *
 * @internal
 */
export function clearAnalyticsCache(): void {
	// No-op since analytics is integrated into the store
}
