import type { PolicyDecision, ResolvedPolicy } from '~/api/init';
import type { jurisdictionCodes } from './constants';
export {
	createPolicyFingerprint,
	type FingerprintHashStrategy,
	hashSha256Hex,
} from './policy-fingerprint';
export type JurisdictionCode = (typeof jurisdictionCodes)[number];
export type PolicyModel = 'opt-in' | 'opt-out' | 'none' | 'iab';
export type PolicyScopeMode = 'strict' | 'permissive';
export type PolicyUiMode = 'none' | 'banner' | 'dialog';
export type PolicyUiAction = 'accept' | 'reject' | 'customize';
export type PolicyUiActionDirection = 'row' | 'column';
export type PolicyUiActionGroup = PolicyUiAction | PolicyUiAction[];
export type PolicyUiProfile = 'balanced' | 'compact' | 'strict';
/**
 * UI customizations for a single consent surface within a policy.
 *
 * @remarks
 * This is used by `ui.banner` and `ui.dialog` on {@link PolicyConfig}. These
 * overrides are ignored for IAB policies because TCF mode controls that UI.
 *
 * @see {@link https://c15t.com/docs/frameworks/react/concepts/policy-packs}
 */
export interface PolicyUiSurfaceConfig {
	allowedActions?: PolicyUiAction[];
	primaryActions?: PolicyUiAction[];
	layout?: PolicyUiActionGroup[];
	direction?: PolicyUiActionDirection;
	uiProfile?: PolicyUiProfile;
	scrollLock?: boolean;
}
/**
 * Canonical runtime policy definition shared across backend and frontend.
 *
 * @remarks
 * Policy packs are ordered arrays of `PolicyConfig`. On the backend they are
 * configured via `c15tInstance({ policyPacks })`; on the frontend they can be
 * previewed in offline mode with `offlinePolicy.policyPacks`.
 *
 * c15t resolves packs with fixed precedence:
 *
 * 1. region
 * 2. country
 * 3. fallback (only when geo-location is unknown)
 * 4. default
 *
 * Within the same matcher type, first match wins by array order.
 *
 * @see {@link https://c15t.com/docs/frameworks/react/concepts/policy-packs}
 * @see {@link https://c15t.com/docs/self-host/guides/policy-packs}
 */
export interface PolicyConfig {
	id: string;
	match: {
		regions?: Array<{
			country: string;
			region: string;
		}>;
		countries?: string[];
		isDefault?: boolean;
		fallback?: boolean;
	};
	i18n?: {
		language?: string;
		messageProfile?: string;
	};
	consent?: {
		model?: PolicyModel;
		expiryDays?: number;
		/**
		 * Controls how categories outside the `categories` allowlist are treated.
		 *
		 * - `'permissive'` (default): out-of-scope categories are not blocked by
		 *   c15t runtime — scripts and iframes for those categories load normally.
		 * - `'strict'`: out-of-scope categories remain blocked and are enforced on
		 *   consent writes (the backend rejects preferences for disallowed categories).
		 */
		scopeMode?: PolicyScopeMode;
		categories?: string[];
		preselectedCategories?: string[];
		/**
		 * Whether this policy should respect the Global Privacy Control (GPC) signal.
		 *
		 * When `true`, the presence of a GPC signal (`Sec-GPC: 1` header or
		 * `navigator.globalPrivacyControl`) causes marketing and measurement
		 * categories to be treated as opted-out for auto-granted consents.
		 *
		 * Defaults to `false`. Typically enabled for CCPA/California policies
		 * where GPC is a legally recognized opt-out mechanism, and left disabled
		 * for GDPR/EEA policies where consent is already opt-in.
		 */
		gpc?: boolean;
	};
	ui?: {
		mode?: PolicyUiMode;
		banner?: PolicyUiSurfaceConfig;
		dialog?: PolicyUiSurfaceConfig;
	};
	proof?: {
		storeIp?: boolean;
		storeUserAgent?: boolean;
		storeLanguage?: boolean;
	};
}
/**
 * @deprecated Use `PolicyConfig[]` directly instead. This alias will be
 * removed in a future version.
 */
export type PolicyPack = PolicyConfig[];
/**
 * Matcher portion of a {@link PolicyConfig}.
 *
 * @see {@link https://c15t.com/docs/frameworks/react/concepts/policy-packs#matching-order}
 */
export type PolicyMatch = PolicyConfig['match'];
export type PolicyMatchedBy = PolicyDecision['matchedBy'];
/**
 * Result of resolving a policy pack for one request.
 *
 * @remarks
 * This is the explainable runtime output behind `/init.policyDecision` and
 * offline policy preview metadata.
 *
 * @see {@link https://c15t.com/docs/frameworks/react/concepts/policy-packs#snapshots-and-debugging}
 */
export interface ResolvedPolicyDecision {
	policy: ResolvedPolicy;
	matchedBy: PolicyMatchedBy;
	fingerprint: string;
}
/**
 * Same as {@link ResolvedPolicyDecision} but without the fingerprint.
 * Returned by the synchronous {@link resolvePolicySync}.
 */
export interface ResolvedPolicyMatch {
	policy: ResolvedPolicy;
	matchedBy: PolicyMatchedBy;
}
/**
 * Validation report for a policy pack.
 *
 * @remarks
 * Errors indicate invalid configuration. Warnings indicate ambiguous or risky
 * configuration such as overlapping matchers without a clear default.
 */
export interface PolicyValidationResult {
	errors: string[];
	warnings: string[];
}
export declare const POLICY_MATCH_DATASET_VERSION = '2026-03-10';
export declare const EU_COUNTRY_CODES: readonly [
	'AT',
	'BE',
	'BG',
	'HR',
	'CY',
	'CZ',
	'DK',
	'EE',
	'FI',
	'FR',
	'DE',
	'GR',
	'HU',
	'IE',
	'IT',
	'LV',
	'LT',
	'LU',
	'MT',
	'NL',
	'PL',
	'PT',
	'RO',
	'SK',
	'SI',
	'ES',
	'SE',
];
export declare const EEA_COUNTRY_CODES: readonly [
	'AT',
	'BE',
	'BG',
	'HR',
	'CY',
	'CZ',
	'DK',
	'EE',
	'FI',
	'FR',
	'DE',
	'GR',
	'HU',
	'IE',
	'IT',
	'LV',
	'LT',
	'LU',
	'MT',
	'NL',
	'PL',
	'PT',
	'RO',
	'SK',
	'SI',
	'ES',
	'SE',
	'IS',
	'LI',
	'NO',
];
export declare const UK_COUNTRY_CODES: readonly ['GB'];
/**
 * Matcher helpers for composing {@link PolicyConfig.match} objects.
 *
 * @remarks
 * These helpers normalize country and region casing and make intent explicit in
 * both backend config and tests.
 *
 * @see {@link https://c15t.com/docs/frameworks/react/concepts/policy-packs#matching-order}
 */
export declare const policyMatchers: {
	default(): PolicyMatch;
	fallback(): PolicyMatch;
	countries(countries: string[]): PolicyMatch;
	regions(
		regions: Array<{
			country: string;
			region: string;
		}>
	): PolicyMatch;
	eu(): PolicyMatch;
	eea(): PolicyMatch;
	uk(): PolicyMatch;
	iab(): PolicyMatch;
	merge(...matches: PolicyMatch[]): PolicyMatch;
};
/**
 * Inspects a policy pack and returns both errors and warnings.
 *
 * @see {@link https://c15t.com/docs/self-host/guides/policy-packs}
 */
export declare function inspectPolicies(
	policies: unknown,
	options?: {
		iabEnabled?: boolean;
	}
): PolicyValidationResult;
/**
 * Validates a policy pack and throws on the first error.
 *
 * @see {@link https://c15t.com/docs/self-host/guides/policy-packs}
 */
export declare function validatePolicies(
	policies: unknown,
	options?: {
		iabEnabled?: boolean;
	}
): void;
/**
 * Resolves the active policy for a single request.
 *
 * @remarks
 * Returns `undefined` when no pack is configured, when the configured pack is
 * invalid, or when no configured policy matches the request and no default is
 * present.
 *
 * @see {@link https://c15t.com/docs/frameworks/react/concepts/policy-packs}
 * @see {@link https://c15t.com/docs/self-host/guides/policy-packs}
 */
export declare function resolvePolicyDecision(params: {
	policies?: unknown;
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction?: JurisdictionCode;
	iabEnabled?: boolean;
}): Promise<ResolvedPolicyDecision | undefined>;
/**
 * Synchronous variant of {@link resolvePolicyDecision} that skips fingerprint
 * computation. Use this when you only need the resolved policy and match
 * metadata but not the cryptographic fingerprint.
 *
 * @see {@link https://c15t.com/docs/frameworks/react/concepts/policy-packs}
 */
export declare function resolvePolicySync(params: {
	policies?: unknown;
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction?: JurisdictionCode;
	iabEnabled?: boolean;
}): ResolvedPolicyMatch | undefined;
