/**
 * Shared types for the network-blocker module.
 *
 * Public types (`NetworkBlockerOptions`, `NetworkBlockerHandle`) are
 * re-exported by `index.ts`. Internal `BlockDecision` is exported here
 * so `decide.ts` and the patch installers can share it. Re-exports
 * mirror the v2 surface so adapters can import either way.
 */

import type { extractConsentNamesFromCondition } from '../../libs/has';
import type {
	BlockedRequestInfo,
	NetworkBlockerConfig,
	NetworkBlockerRule,
} from '../../libs/network-blocker/types';
import type {
	declareOwnedVendors,
	forgetOwnedVendors,
} from '../../libs/vendors';
import type { ConsentKernel } from '../../types';
import type { evaluateConsent } from '../has';
import type {
	blockedResponse,
	failBlockedXhr,
	NetworkHold,
	releaseNetworkRequests,
	stashXhr,
	XHR_REQUEST,
} from './hold';

export type { BlockedRequestInfo, NetworkBlockerConfig, NetworkBlockerRule };

export interface NetworkBlockerOptions extends Omit<
	NetworkBlockerConfig,
	'initialDraft'
> {
	kernel: ConsentKernel;
	/**
	 * The caller's hold from `holdNetworkRequests()`. The blocker takes over
	 * only these requests and leaves other callers' holds in place. Without
	 * it, the blocker ends every hold.
	 * @internal
	 */
	hold?: NetworkHold;
}

export interface NetworkBlockerHandle {
	dispose: () => void;
	/**
	 * Replace the rules list. Takes effect on the next intercepted request.
	 * `hold`, from `holdNetworkRequests(next)`, is taken over once the rules
	 * apply: the requests it held replay through the blocker. A blocker that
	 * loads on demand applies both when its chunk lands.
	 */
	updateRules: (next: NetworkBlockerRule[], hold?: NetworkHold) => void;
	/** Toggle enable/disable without tearing down the patches. */
	setEnabled: (enabled: boolean) => void;
}

/**
 * Outcome of evaluating a single request against the rules list and
 * the current snapshot.
 */
export interface BlockDecision {
	shouldBlock: boolean;
	rule?: NetworkBlockerRule;
}

/**
 * What the blocker calls but does not import, so it can load on demand as
 * one self-contained chunk. The hold functions keep page-wide state, so
 * these are always the shared implementations; the public entry passes
 * them.
 * @internal
 */
export interface NetworkBlockerTools {
	blockedResponse: typeof blockedResponse;
	/** `extractConsentNamesFromCondition`. */
	categoriesOf: typeof extractConsentNamesFromCondition;
	/** `declareOwnedVendors`. */
	declareOwners: typeof declareOwnedVendors;
	/** `evaluateConsent`. */
	evaluate: typeof evaluateConsent;
	failBlockedXhr: typeof failBlockedXhr;
	/** `forgetOwnedVendors`. */
	forgetOwners: typeof forgetOwnedVendors;
	/** `releaseNetworkRequests`. */
	releaseHolds: typeof releaseNetworkRequests;
	stashXhr: typeof stashXhr;
	/** The key the hold's XHR patch stores a request under. */
	xhrRequest: typeof XHR_REQUEST;
}
