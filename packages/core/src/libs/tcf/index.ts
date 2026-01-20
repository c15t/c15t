/**
 * IAB TCF 2.3 Support Module
 *
 * Provides IAB Transparency & Consent Framework support for c15t.
 * This is an opt-in feature - no bundle impact for users who don't enable it.
 *
 * @packageDocumentation
 */

// CMP API
export { createCMPApi } from './cmp-api';
// GVL fetching
export { clearGVLCache, fetchGVL, getCachedGVL } from './fetch-gvl';

// Lazy loading
export {
	getTCFCore,
	getTCFCoreSync,
	isTCFCoreLoaded,
	resetTCFCoreCache,
	type TCFCoreModule,
} from './lazy-load';
// Purpose mapping
export {
	C15T_TO_IAB_PURPOSE_MAP,
	c15tConsentsToIabPurposes,
	c15tToIabPurposes,
	categorizeVendorPurposes,
	IAB_PURPOSE_TO_C15T_MAP,
	iabPurposesToC15tConsents,
	iabPurposeToC15t,
	vendorHasRequiredConsents,
} from './purpose-mapping';
// Stacks
export {
	DEFAULT_STACKS,
	flattenPurposesByStack,
	type GroupedPurposes,
	getPurposesInStack,
	getStackForPurpose,
	groupPurposesIntoStacks,
	isStandalonePurpose,
	purposesToArray,
	type ResolvedStack,
	STANDALONE_PURPOSE_ID,
} from './stacks';
// Store manager
export { createIABManager } from './store';

// IAB Stub
export {
	clearStubQueue,
	destroyIABStub,
	getStubQueue,
	initializeIABStub,
	isStubActive,
	isStubInitialized,
} from './stub';
// TC String utilities
export {
	type DecodedTCString,
	decodeTCString,
	generateTCString,
	hasPurposeConsent,
	hasVendorConsent,
	isValidTCStringFormat,
	type TCStringConfig,
} from './tc-string';
// Types
export type { CMPApi, CMPApiConfig, FetchGVLResult, IABConfig } from './types';
export { GVL_ENDPOINT, IAB_STORAGE_KEYS } from './types';
