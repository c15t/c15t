import { createNetworkBlockerWith } from './blocker';
/**
 * `@c15t/core/modules/network-blocker`
 *
 * Kernel-consuming network blocker. Patches `window.fetch` and
 * `XMLHttpRequest.prototype.{open, send}` to intercept requests and
 * block ones whose consent condition isn't satisfied. See `blocker.ts`.
 */
import { networkBlockerTools } from './tools';
import type { NetworkBlockerHandle, NetworkBlockerOptions } from './types';

export type {
	BlockDecision,
	BlockedRequestInfo,
	NetworkBlockerConfig,
	NetworkBlockerHandle,
	NetworkBlockerOptions,
	NetworkBlockerRule,
} from './types';

/**
 * Create a network blocker.
 *
 * @param options - The kernel, the rules and, from a runtime, its hold.
 * @returns The blocker handle.
 */
export const createNetworkBlocker = function createNetworkBlocker(
	options: NetworkBlockerOptions
): NetworkBlockerHandle {
	return createNetworkBlockerWith(options, networkBlockerTools);
};
