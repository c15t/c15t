/**
 * Shared types for the network-blocker module.
 *
 * Public types (`NetworkBlockerOptions`, `NetworkBlockerHandle`) are
 * re-exported by `index.ts`. Internal `BlockDecision` is exported here
 * so `decide.ts` and the patch installers can share it. Re-exports
 * mirror the v2 surface so adapters can import either way.
 */

import type {
	BlockedRequestInfo,
	NetworkBlockerConfig,
	NetworkBlockerRule,
} from '../../../libs/network-blocker/types';
import type { ConsentKernel } from '../../types';

export type { BlockedRequestInfo, NetworkBlockerConfig, NetworkBlockerRule };

export interface NetworkBlockerOptions
	extends Omit<NetworkBlockerConfig, 'initialConsents'> {
	kernel: ConsentKernel;
}

export interface NetworkBlockerHandle {
	dispose(): void;
	/** Replace the rules list. Takes effect on the next intercepted request. */
	updateRules(next: NetworkBlockerRule[]): void;
	/** Toggle enable/disable without tearing down the patches. */
	setEnabled(enabled: boolean): void;
}

/**
 * Outcome of evaluating a single request against the rules list and
 * the current snapshot.
 */
export interface BlockDecision {
	shouldBlock: boolean;
	rule?: NetworkBlockerRule;
}
