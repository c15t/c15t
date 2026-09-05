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
	IdentityPrivacyDirectiveInput,
	ListPrivacyDirectivesOutput,
	ListSubjectsOutput,
	ListSubjectsQuery,
	PatchSubjectFullInput,
	PatchSubjectOutput,
	PostSubjectInput,
	PostSubjectOutput,
	PrivacyDirectiveWire,
	RecordPrivacyDirectiveOutput,
	SubjectCategoryReceiptWire,
	SubjectChoiceBasisWire,
	SubjectChoiceWire,
	SubjectItem,
	SubjectPrivacyDirectiveInput,
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
	ConsentManifestPolicyFailure,
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
	CONSENT_REQUEST_HEADER_NAMES,
	COUNTRY_HEADERS,
	checkJurisdiction,
	consentInputsToOverrides,
	createConsentManifestPolicyPack,
	EEA_COUNTRY_CODES,
	EU_COUNTRY_CODES,
	extractConsentRequestInputs,
	getTranslations,
	getTranslationsData,
	listProfiles,
	POLICY_MATCH_DATASET_VERSION,
	parseGlobalPrivacyControl,
	policyMatchers,
	REGION_HEADERS,
	resolveBackendURL,
	resolveInitFromManifest,
	resolvePolicyResolutionFromManifest,
	sliceConsentManifestLanguage,
	UK_COUNTRY_CODES,
	validateMessages,
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
export {
	createDeterministicFingerprint,
	createDeterministicFingerprintSync,
	createMaterialPolicyFingerprint,
	createMaterialPolicyFingerprintSync,
	hashSha256Hex,
	stableStringify,
} from './shared/policy-fingerprint';
export type {
	PolicyMatchEntry,
	PolicyMatchOutcome,
	PolicyResolution,
	PolicyResolutionFailed,
	PolicyResolutionFailure,
	PolicyResolutionMatched,
	PolicyResolutionNoMatch,
	PolicyResolutionUnconfigured,
	PolicyResolutionWire,
	SafeFallbackPolicyInput,
} from './shared/policy-resolution';
export {
	matchPolicyRules,
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
	parsePolicyContractHeader,
	readPolicyResolutionWire,
	resolvePolicyRules,
	SAFE_FALLBACK_POLICY_FINGERPRINTS,
	SAFE_FALLBACK_POLICY_ID,
	safeFallbackPolicyInput,
	safeFallbackPolicyRule,
	writePolicyResolutionWire,
} from './shared/policy-resolution';
export type {
	PolicyActionConstraints,
	PolicyChoiceAction,
	PolicyConsentCategory,
	PolicyOptionalCategory,
	PolicyPrompt,
	PolicyPromptAction,
	PolicyRight,
	PolicyRule,
	PolicyRuleModel,
	PolicyRuleReview,
	ResolvedPolicyRule,
} from './shared/policy-rule';
export {
	canonicalizePolicySet,
	collectResolvedPolicyRuleIssues,
	DEFAULT_CHOICE_VALIDITY_DAYS,
	DEFAULT_NOTICE_VALIDITY_DAYS,
	expectedPolicyActions,
	inspectPolicyRules,
	isPlainPolicyObject,
	isPolicyOptionalCategory,
	isPolicyPrompt,
	isPolicyRight,
	isPolicyRuleModel,
	isValidPolicyPromptForModel,
	normalizePolicyRule,
	POLICY_CONSENT_CATEGORIES,
	POLICY_MODEL_PROMPTS,
	POLICY_OPTIONAL_CATEGORIES,
	POLICY_PROMPT_ACTIONS,
	POLICY_PROMPTS,
	POLICY_RIGHTS,
	POLICY_RULE_MODELS,
	requiredPolicyRights,
	validatePolicyRules,
} from './shared/policy-rule';
export type {
	ChoicePromptFingerprintInput,
	JsonValue,
	NoticePromptFingerprintInput,
	PolicyFingerprintInput,
	PolicyFingerprints,
	PresentationFingerprintInput,
} from './shared/policy-rule-fingerprint';
export {
	CHOICE_PROMPT_FINGERPRINT_VERSION,
	choicePromptFingerprintInput,
	createPolicyRuleFingerprints,
	createPresentationFingerprint,
	NOTICE_PROMPT_FINGERPRINT_VERSION,
	noticePromptFingerprintInput,
	POLICY_FINGERPRINT_VERSION,
	policyFingerprintInput,
	PRESENTATION_FINGERPRINT_VERSION,
} from './shared/policy-rule-fingerprint';
export type {
	EuropePolicyRuleMode,
	PolicyRulePresets,
} from './shared/policy-rule-presets';
export { policyRulePresets } from './shared/policy-rule-presets';
export type {
	PolicyI18nMessageProfileLike,
	PolicyI18nValidationOptions,
	PolicyI18nValidationResult,
} from './shared/policy-i18n-validation';
export { validatePolicyI18nConfig } from './shared/policy-i18n-validation';
export type {
	PolicyMatch,
	PolicyMatchedBy,
	PolicyModel,
	PolicyScopeMode,
	PolicyValidationResult,
} from './shared/policy-runtime';
// Re-export constants for runtime checks (no Zod involved)
export { brandingValues, jurisdictionCodes };

export type {
	LegacyMaterialCompatibility,
	LegacyMaterialPolicyInput,
	LegacyMaterialSurfaceInput,
} from './shared/legacy-material-policy';
