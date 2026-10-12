import { createClearOnRevocationWith } from './clear';
import { clearOnRevocationTools } from './tools';
import type {
	ClearOnRevocationHandle,
	ClearOnRevocationOptions,
} from './types';

export type {
	ClearOnRevocationConfig,
	ClearOnRevocationCookie,
	ClearOnRevocationHandle,
	ClearOnRevocationOptions,
	ClearOnRevocationTargets,
} from './types';

/**
 * Remove configured browser data for denied optional consent categories.
 * Waits for policy resolution, then clears once on attachment and whenever
 * a granted category becomes denied. Draft edits do not trigger cleanup.
 * Browser storage failures are ignored so consent changes can still complete.
 *
 * @param options - Kernel, category targets, and persistence configuration.
 * @returns A subscription handle. Disposing does not clear data.
 * @example
 * ```ts
 * const cleanup = createClearOnRevocation({
 *   kernel,
 *   config: { measurement: { cookies: ['_ga', '_ga_*'] } },
 * });
 * ```
 */
export const createClearOnRevocation = (
	options: ClearOnRevocationOptions
): ClearOnRevocationHandle =>
	createClearOnRevocationWith(options, clearOnRevocationTools);
