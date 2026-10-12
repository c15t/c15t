/**
 * The first-load functions the network blocker calls, passed to
 * `blocker.ts` rather than imported there, so the blocker can load on
 * demand as one chunk that imports nothing the first load has. The hold
 * and vendor ownership keep page-wide state, so these are always the
 * shared implementations.
 *
 * Imported by the public entry and by `onDemandRuntimeModules`, never by
 * the blocker itself.
 *
 * @internal
 */
import { extractConsentNamesFromCondition } from '../../libs/has';
import { declareOwnedVendors, forgetOwnedVendors } from '../../libs/vendors';
import { evaluateConsent } from '../has';
import {
	blockedResponse,
	failBlockedXhr,
	releaseNetworkRequests,
	stashXhr,
	XHR_REQUEST,
} from './hold';
import type { NetworkBlockerTools } from './types';

/** @internal */
export const networkBlockerTools: NetworkBlockerTools = {
	blockedResponse,
	categoriesOf: extractConsentNamesFromCondition,
	declareOwners: declareOwnedVendors,
	evaluate: evaluateConsent,
	failBlockedXhr,
	forgetOwners: forgetOwnedVendors,
	releaseHolds: releaseNetworkRequests,
	stashXhr,
	xhrRequest: XHR_REQUEST,
};
