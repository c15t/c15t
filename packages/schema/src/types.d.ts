/**
 * @packageDocumentation
 * Pure TypeScript types for c15t consent management.
 *
 * This module exports only TypeScript types without any Valibot runtime code,
 * making it safe to use in frontend applications without adding bundle size.
 *
 * For validation schemas with Valibot, import from '@c15t/schema'
 */
import { brandingValues, jurisdictionCodes } from './shared/constants';
export type {
	CheckConsentOutput,
	CheckConsentQuery,
	ConsentCheckResult,
} from './api/consent';
export type {
	InitOutput,
	LocationResponse,
	PolicyDecision,
	ResolvedPolicy,
	TranslationsResponse,
} from './api/init';
export type {
	LegalDocumentCurrentInput,
	LegalDocumentCurrentOutput,
	LegalDocumentCurrentParams,
} from './api/legal-document';
export type { StatusOutput } from './api/meta';
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
export type {
	AuditLog,
	Consent,
	ConsentPolicy,
	ConsentPurpose,
	Domain,
	LegalDocumentPolicyType,
	PolicyType,
	RuntimePolicyDecision,
	Subject,
} from './domain';
export type Branding = (typeof brandingValues)[number];
export type JurisdictionCode = (typeof jurisdictionCodes)[number];
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
export type {
	NonIABVendor,
	NonIABVendorConsent,
} from './shared/non-iab-vendor';
export { type PolicyDefaults, policyDefaults } from './shared/policy-defaults';
export {
	createDeterministicFingerprint,
	createDeterministicFingerprintSync,
	createMaterialPolicyFingerprint,
	createPolicyFingerprint,
	hashSha256Hex,
	stableStringify,
} from './shared/policy-fingerprint';
export type {
	PolicyI18nMessageProfileLike,
	PolicyI18nValidationOptions,
	PolicyI18nValidationResult,
} from './shared/policy-i18n-validation';
export { validatePolicyI18nConfig } from './shared/policy-i18n-validation';
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
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiMode,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
	PolicyValidationResult,
	ResolvedPolicyDecision,
	ResolvedPolicyMatch,
} from './shared/policy-runtime';
export {
	EEA_COUNTRY_CODES,
	EU_COUNTRY_CODES,
	inspectPolicies,
	POLICY_MATCH_DATASET_VERSION,
	policyMatchers,
	resolvePolicyDecision,
	resolvePolicySync,
	UK_COUNTRY_CODES,
	validatePolicies,
} from './shared/policy-runtime';
export { brandingValues, jurisdictionCodes };
