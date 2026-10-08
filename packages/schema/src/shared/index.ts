export { type Branding, brandingSchema, brandingValues } from './branding';
export { parseConsentManifest } from './consent-manifest-schema';
export { type Hosting, hostingSchema, hostingValues } from './hosting';
export {
	buildConsentManifestFromConfig,
	type ConsentManifest,
	type ConsentManifestBranding,
	type ConsentManifestConfig,
	type ConsentManifestGVLReference,
	type ConsentManifestHosting,
	type ConsentManifestIAB,
	type ConsentManifestPolicyFailure,
	type ConsentManifestPolicyPack,
	type ConsentManifestTranslationInputs,
	createConsentManifestPolicyPack,
	type ResolveInitFromManifestInputs,
	type ResolveInitFromManifestOptions,
	resolveInitFromManifest,
	resolvePolicyResolutionFromManifest,
	sliceConsentManifestLanguage,
} from './consent-manifest';
export {
	appendJourneyParams,
	type BuildConsentSessionReportOptions,
	buildConsentSessionReport,
	CONSENT_EXPERIMENT_HEADER,
	CONSENT_JOURNEY_PARAM,
	CONSENT_JOURNEY_SCOPE_PARAM,
	CONSENT_JOURNEY_STORED_PARAM,
	CONSENT_SESSION_CLIENT_IP_HEADER,
	type ConsentJourneyParams,
	type ConsentJourneyPrompt,
	type ConsentJourneyScope,
	deriveJourneyPrompt,
	formatExperimentHeader,
	isSpeculativeRequest,
	journeyDomainFrom,
	parseExperimentHeader,
	parseJourneyId,
	parseJourneyScope,
	readJourneyParams,
	type SessionExperiment,
	type SessionJourney,
	type SessionReportInputs,
} from './session-report';
// Export constants separately for runtime-safe usage
export { brandingValues as brandingValuesConst } from './constants';
export {
	buildConsentId,
	type ConsentSubmissionIdentity,
	type EntityKind,
	generateDeterministicId,
	generateEntityId,
} from './entity-id';
export {
	CONSENT_REQUEST_HEADER_NAMES,
	COUNTRY_HEADERS,
	type ConsentRequestHeaderInputs,
	consentInputsToOverrides,
	extractConsentRequestInputs,
	getRegionFromHeaders,
	headersToRecord,
	parseGlobalPrivacyControl,
	REGION_HEADERS,
} from './geo-headers';
export {
	type GlobalVendorList,
	type GVLDataCategory,
	type GVLFeature,
	type GVLPurpose,
	type GVLSpecialFeature,
	type GVLSpecialPurpose,
	type GVLStack,
	type GVLStandardTexts,
	type GVLVendor,
	type GVLVendorUrl,
	globalVendorListSchema,
	gvlDataCategorySchema,
	gvlFeatureSchema,
	gvlPurposeSchema,
	gvlSpecialFeatureSchema,
	gvlSpecialPurposeSchema,
	gvlStackSchema,
	gvlStandardTextsSchema,
	gvlVendorSchema,
	gvlVendorUrlSchema,
} from './gvl';
export {
	type NonIABVendor,
	type NonIABVendorConsent,
	nonIABVendorConsentSchema,
	nonIABVendorSchema,
} from './non-iab-vendor';
export {
	type Vendor,
	type VendorCategoryCondition,
	vendorCategoryConditionSchema,
	vendorIdSchema,
	vendorSchema,
} from './vendor';
export {
	createDeterministicFingerprint,
	createDeterministicFingerprintSync,
	createMaterialPolicyFingerprint,
	createMaterialPolicyFingerprintSync,
	hashSha256Hex,
	stableStringify,
} from './policy-fingerprint';
export {
	matchPolicyRules,
	type PolicyMatchEntry,
	type PolicyMatchOutcome,
	resolvePolicyRules,
} from './policy-resolution';
export {
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
	type PolicyResolution,
	type PolicyResolutionFailed,
	type PolicyResolutionFailure,
	type PolicyResolutionMatched,
	type PolicyResolutionNoMatch,
	type PolicyResolutionUnconfigured,
	type PolicyResolutionWire,
	parsePolicyContractHeader,
	readPolicyResolutionWire,
	SAFE_FALLBACK_POLICY_FINGERPRINTS,
	SAFE_FALLBACK_POLICY_ID,
	type SafeFallbackPolicyInput,
	safeFallbackPolicyInput,
	safeFallbackPolicyRule,
	writePolicyResolutionWire,
} from './policy-resolution-wire';
export {
	canonicalizePolicySet,
	collectResolvedPolicyRuleIssues,
	expectedPolicyActions,
	isPlainPolicyObject,
	isPolicyOptionalCategory,
	isPolicyPrompt,
	isPolicyRight,
	isPolicyRuleModel,
	isValidPolicyPromptForModel,
	POLICY_CONSENT_CATEGORIES,
	POLICY_MODEL_PROMPTS,
	POLICY_OPTIONAL_CATEGORIES,
	POLICY_PROMPT_ACTIONS,
	POLICY_PROMPTS,
	POLICY_RIGHTS,
	POLICY_RULE_MODELS,
	requiredPolicyRights,
} from './policy-rule-invariants';
export { compareCanonical } from './canonical-order';
export {
	DEFAULT_CHOICE_VALIDITY_DAYS,
	DEFAULT_NOTICE_VALIDITY_DAYS,
	inspectPolicyRules,
	normalizePolicyRule,
	type PolicyActionConstraints,
	type PolicyChoiceAction,
	type PolicyConsentCategory,
	type PolicyOptionalCategory,
	type PolicyPrompt,
	type PolicyPromptAction,
	type PolicyRight,
	type PolicyRule,
	type PolicyRuleModel,
	type PolicyRuleReview,
	type ResolvedPolicyRule,
	validatePolicyRules,
} from './policy-rule';
export {
	CHOICE_PROMPT_FINGERPRINT_VERSION,
	type ChoicePromptFingerprintInput,
	choicePromptFingerprintInput,
	createPolicyRuleFingerprints,
	createPresentationFingerprint,
	type JsonValue,
	NOTICE_PROMPT_FINGERPRINT_VERSION,
	type NoticePromptFingerprintInput,
	noticePromptFingerprintInput,
	POLICY_FINGERPRINT_VERSION,
	type PolicyFingerprintInput,
	type PolicyFingerprints,
	policyFingerprintInput,
	PRESENTATION_FINGERPRINT_VERSION,
	type PresentationFingerprintInput,
} from './policy-rule-fingerprint';
export {
	type EuropePolicyRuleMode,
	type PolicyRulePresets,
	policyRulePresets,
	type RecommendedPolicyRulesOptions,
	recommendedPolicyRules,
} from './policy-rule-presets';
export {
	policyActionConstraintsSchema,
	policyFingerprintsSchema,
	policyOptionalCategorySchema,
	policyPromptActionSchema,
	policyPromptSchema,
	policyResolutionFailureSchema,
	type PolicyResolutionWireOutput,
	policyResolutionWireSchema,
	policyRightSchema,
	policyRuleModelSchema,
	resolvedPolicyRuleSchema,
} from './policy-wire-schema';
export {
	type PolicyI18nMessageProfileLike,
	type PolicyI18nValidationOptions,
	type PolicyI18nValidationResult,
	validatePolicyI18nConfig,
} from './policy-i18n-validation';
export {
	EEA_COUNTRY_CODES,
	EU_COUNTRY_CODES,
	POLICY_MATCH_DATASET_VERSION,
	type PolicyMatch,
	type PolicyMatchedBy,
	type PolicyModel,
	type PolicyScopeMode,
	type PolicyValidationResult,
	policyMatchers,
	UK_COUNTRY_CODES,
} from './policy-runtime';
export {
	compactDefined,
	dedupeDefinedValues,
	dedupeTrimmedStrings,
} from './policy-utils';
export { resolveBackendURL } from './server-url';
export type { ResolveBackendURLOptions } from './server-url';
export {
	getTranslations,
	getTranslationsData,
	type I18nMessageProfile,
	type I18nMessageProfiles,
	type I18nOptions,
	type LoggerLike,
	listProfiles,
	validateMessages,
} from './translations-runtime';

export type {
	LegacyMaterialCompatibility,
	LegacyMaterialPolicyInput,
	LegacyMaterialSurfaceInput,
} from './legacy-material-policy';
