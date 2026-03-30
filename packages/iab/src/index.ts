/**
 * @c15t/iab — IAB TCF 2.3 and GPP addon for c15t
 *
 * Provides IAB Transparency & Consent Framework support as an opt-in addon.
 * Non-IAB users pay zero bundle cost — this package is only loaded when
 * explicitly installed and configured.
 *
 * @example
 * ```tsx
 * import { iab } from '@c15t/iab';
 *
 * <ConsentManagerProvider options={{
 *   mode: 'hosted',
 *   iab: iab({ cmpId: 28, vendors: [1, 2, 755] }),
 * }}>
 * ```
 *
 * @packageDocumentation
 */

// Re-export types for advanced usage
export type {
	IABActions,
	IABConfig,
	IABManager,
	IABModule,
	IABState,
} from 'c15t';
export { type IABUserConfig, iab } from './factory';
export { fetchGVL } from './tcf/fetch-gvl';
export {
	c15tToIabPurposes,
	iabPurposesToC15tConsents,
} from './tcf/purpose-mapping';
// Re-export TCF utilities
export { createIABManager } from './tcf/store';
export { destroyIABStub, initializeIABStub } from './tcf/stub';
export {
	type DecodedTCString,
	decodeTCString,
	generateTCString,
	type TCStringConfig,
} from './tcf/tc-string';
