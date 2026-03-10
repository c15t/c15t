/**
 * @packageDocumentation
 * Pure TypeScript types for c15t consent management.
 *
 * This module exports only TypeScript types without any Valibot runtime code,
 * making it safe to use in frontend applications without adding bundle size.
 *
 * For validation schemas with Valibot, import from '@c15t/schema'
 */

// Import constants directly to avoid Zod
import { brandingValues, jurisdictionCodes } from './shared/constants';

// API types - Consent (v2.0: only check endpoint remains)
export type {
	CheckConsentOutput,
	CheckConsentQuery,
	ConsentCheckResult,
} from './api/consent';
// API types - Init
export type {
	InitOutput,
	LocationResponse,
	PolicyDecision,
	ResolvedPolicy,
	TranslationsResponse,
} from './api/init';
// API types - Meta
export type { StatusOutput } from './api/meta';
// API types - Subject
export type {
	ConsentItem,
	GetSubjectInput,
	GetSubjectOutput,
	GetSubjectParams,
	GetSubjectQuery,
	ListSubjectsOutput,
	ListSubjectsQuery,
	PatchSubjectFullInput,
	PatchSubjectOutput,
	PostSubjectInput,
	PostSubjectOutput,
	SubjectItem,
} from './api/subject';
// Domain types
export type {
	AuditLog,
	Consent,
	ConsentPolicy,
	ConsentPurpose,
	Domain,
	PolicyType,
	RuntimePolicyDecision,
	Subject,
} from './domain';

// Shared types - derived from constants without Zod
export type Branding = (typeof brandingValues)[number];
export type JurisdictionCode = (typeof jurisdictionCodes)[number];

// GVL types - IAB TCF Global Vendor List
export type {
	GlobalVendorList,
	GVLDataCategory,
	GVLFeature,
	GVLPurpose,
	GVLSpecialFeature,
	GVLSpecialPurpose,
	GVLStack,
	GVLVendor,
	GVLVendorUrl,
} from './shared/gvl';

// Non-IAB vendor types - Custom vendors not registered with IAB
export type {
	NonIABVendor,
	NonIABVendorConsent,
} from './shared/non-iab-vendor';
export {
	type PolicyDefaults,
	policyDefaults,
} from './shared/policy-defaults';
export {
	createDeterministicFingerprint,
	createDeterministicFingerprintSync,
	createPolicyFingerprint,
	hashSha256Hex,
	stableStringify,
} from './shared/policy-fingerprint';
export type {
	EuropePolicyMode,
	PolicyPackPresets,
} from './shared/policy-pack-defaults';
export { policyPackPresets } from './shared/policy-pack-defaults';
export type {
	FingerprintHashStrategy,
	PolicyConfig,
	PolicyMatch,
	PolicyMatchedBy,
	PolicyModel,
	PolicyPack,
	PolicyScopeMode,
	PolicyUiAction,
	PolicyUiActionLayout,
	PolicyUiMode,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
	PolicyValidationResult,
	ResolvedPolicyDecision,
} from './shared/policy-runtime';
export {
	EEA_COUNTRY_CODES,
	EU_COUNTRY_CODES,
	IAB_POLICY_JURISDICTIONS,
	inspectPolicies,
	POLICY_MATCH_DATASET_VERSION,
	policyMatchers,
	resolvePolicyDecision,
	UK_COUNTRY_CODES,
	validatePolicies,
} from './shared/policy-runtime';

// Re-export constants for runtime checks (no Zod involved)
export { brandingValues, jurisdictionCodes };
