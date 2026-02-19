/**
 * IAB TCF public API entry point.
 *
 * Import from `c15t/iab` to access IAB-specific functionality.
 * This keeps the IAB module (~31KB) out of the main bundle for users
 * who don't need IAB TCF support.
 *
 * @packageDocumentation
 */

export { createCMPApi } from './libs/iab-tcf/cmp-api';
export {
	clearGVLCache,
	fetchGVL,
	getCachedGVL,
	setMockGVL,
} from './libs/iab-tcf/fetch-gvl';
export {
	getTCFCore,
	getTCFCoreSync,
	isTCFCoreLoaded,
	resetTCFCoreCache,
	type TCFCoreModule,
} from './libs/iab-tcf/lazy-load';
export {
	C15T_TO_IAB_PURPOSE_MAP,
	c15tConsentsToIabPurposes,
	c15tToIabPurposes,
	categorizeVendorPurposes,
	IAB_PURPOSE_TO_C15T_MAP,
	iabPurposesToC15tConsents,
	iabPurposeToC15t,
	vendorHasRequiredConsents,
} from './libs/iab-tcf/purpose-mapping';
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
} from './libs/iab-tcf/stacks';
export { createIABManager } from './libs/iab-tcf/store';
export {
	clearStubQueue,
	destroyIABStub,
	getStubQueue,
	initializeIABStub,
	isStubActive,
	isStubInitialized,
} from './libs/iab-tcf/stub';
export {
	type DecodedTCString,
	decodeTCString,
	generateTCString,
	hasPurposeConsent,
	hasVendorConsent,
	isValidTCStringFormat,
	type TCStringConfig,
} from './libs/iab-tcf/tc-string';
export type { CMPApi, FetchGVLResult, IABConfig } from './libs/iab-tcf/types';
export { GVL_ENDPOINT, IAB_STORAGE_KEYS } from './libs/iab-tcf/types';
