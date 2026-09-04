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
export type {
	LegalDocumentCurrentInput,
	LegalDocumentCurrentOutput,
	LegalDocumentCurrentParams,
} from './api/legal-document';
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
	ConsentPolicyType,
	ConsentPurpose,
	Domain,
	LegalDocumentPolicyType,
	LegalDocumentTypePrefix,
	PolicyType,
	RuntimePolicyDecision,
	Subject,
} from './domain';
export {
	isLegalDocumentType,
	LEGAL_DOCUMENT_TYPE_PREFIXES,
} from './shared/legal-document-types';

// Shared types - derived from constants without Zod
export type Branding = (typeof brandingValues)[number];
export type JurisdictionCode = (typeof jurisdictionCodes)[number];

export type {
	ConsentManifest,
	ConsentManifestBranding,
	ConsentManifestConfig,
	ConsentManifestDefaults,
	ConsentManifestGVLReference,
	ConsentManifestIAB,
	ConsentManifestPolicyPack,
	ConsentManifestTranslationInputs,
	ConsentRequestHeaderInputs,
	I18nMessageProfile,
	I18nMessageProfiles,
	I18nOptions,
	LoggerLike,
	ResolveInitFromManifestInputs,
	ResolveInitFromManifestOptions,
} from './shared';
export {
	buildConsentManifestFromConfig,
	buildDefaultOptInPolicy,
	CONSENT_REQUEST_HEADER_NAMES,
	COUNTRY_HEADERS,
	checkJurisdiction,
	consentInputsToOverrides,
	createConsentManifestPolicyPack,
	createResolvedPolicyFromConfig,
	EEA_COUNTRY_CODES,
	EU_COUNTRY_CODES,
	extractConsentRequestInputs,
	getTranslations,
	getTranslationsData,
	headersToRecord,
	inspectPolicies,
	listProfiles,
	POLICY_MATCH_DATASET_VERSION,
	parseGlobalPrivacyControl,
	policyMatchers,
	REGION_HEADERS,
	resolveBackendURL,
	resolveInitFromManifest,
	resolveNoPolicyFallback,
	resolvePolicyDecision,
	resolvePolicySync,
	sliceConsentManifestLanguage,
	UK_COUNTRY_CODES,
	validateMessages,
	validatePolicies,
} from './shared';
export {
	buildConsentId,
	type ConsentSubmissionIdentity,
	type EntityKind,
	generateDeterministicId,
	generateEntityId,
} from './shared/entity-id';
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
export { globalVendorListSchema } from './shared/gvl';
// Non-IAB vendor types - Custom vendors not registered with IAB
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
// Re-export constants for runtime checks (no Zod involved)
export { brandingValues, jurisdictionCodes };
