/**
 * The first-load functions the script loader calls, passed to `loader.ts`
 * rather than imported there, so the loader can load on demand as one
 * chunk that imports nothing the first load has. Vendor ownership keeps
 * state per kernel, so these are always the shared implementations.
 *
 * Imported by the public entry and by `onDemandRuntimeModules`, never by
 * the loader itself.
 *
 * @internal
 */
import { extractConsentNamesFromCondition } from '../../libs/has';
import {
	declareOwnedVendors,
	forgetOwnedVendors,
	isValidVendorId,
} from '../../libs/vendors';
import {
	deniedVendorIds,
	evaluateConsent,
	getEffectiveGateState,
	has,
} from '../has';
import type { ScriptLoaderTools } from './types';

/** @internal */
export const scriptLoaderTools: ScriptLoaderTools = {
	categoriesOf: extractConsentNamesFromCondition,
	declareOwners: declareOwnedVendors,
	deniedVendors: deniedVendorIds,
	evaluate: evaluateConsent,
	forgetOwners: forgetOwnedVendors,
	gateState: getEffectiveGateState,
	has,
	isVendorId: isValidVendorId,
};
