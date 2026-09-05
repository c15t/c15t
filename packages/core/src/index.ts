/**
 * `@c15t/core` — kernel-first consent engine.
 *
 * Design goals:
 * - Pure construction: `createConsentKernel()` has zero side effects.
 *   No window writes, no observers, no network, no DOM.
 * - Framework-neutral contract: `getSnapshot() / subscribe() / set.* / commands.* / events`.
 *   No store library types leaked. Adapters own reactivity.
 * - Isomorphic-safe: imports cleanly in Node, RSC, edge runtimes.
 * - Opt-in side effects: persistence, blockers, script loader, banner fetch
 *   live in `@c15t/core/modules/*` — adapters call them inside useEffect /
 *   onMounted / onMount. Never at kernel construction.
 */

export type {
	CategoryDecision,
	ChoiceBasis,
	CONSENT_CATEGORY,
	ConsentEvaluation,
	ConsentSubject,
	EvaluationPolicy,
	ExplicitChoice,
	NoticeDismissal,
	OptionalConsentCategory,
	PrivacyOptOut,
	PromptReason,
	PromptRequirement,
	RecordIssue,
	RestrictionReason,
} from './consent-record';
export {
	CONSENT_CATEGORIES,
	createEvaluationPolicy,
	evaluateConsentRecord,
	OPTIONAL_CONSENT_CATEGORIES,
	validateExplicitChoice,
	validateNoticeDismissal,
} from './consent-record';
export { createConsentKernel } from './kernel';
export type { KernelIABControls } from './modules/iab-controls';
export {
	getIABControls,
	registerIABControls,
	subscribeIABControls,
} from './modules/iab-controls';
export {
	generateSubjectId,
	isValidSubjectId,
} from './libs/generate-subject-id';
export type {
	C15tWindowDebug,
	WindowDebugHandle,
	WindowDebugMode,
	WindowDebugModeInput,
	WindowDebugOptions,
} from './modules/window-debug';
export {
	createWindowDebug,
	resolveWindowDebugMode,
} from './modules/window-debug';
export type { HostedTransportOptions } from './transports/hosted';
export { createHostedTransport } from './transports/hosted';
export {
	initOutputToKernelConfig,
	initResponseToKernelConfig,
	mapInitOutputToInitResponse,
	mergeInitOutputIntoKernelConfig,
	mergeInitResponseIntoKernelConfig,
} from './transports/init-output';
export type {
	HostedModeOptions,
	ProviderTransportContext,
	ProviderTransportFactory,
	ProviderTransportKind,
} from './transports/mode';
export { custom, hosted } from './transports/mode';
export type {
	OfflineKernelTransport,
	OfflineTransportOptions,
} from './transports/offline';
export { createOfflineTransport } from './transports/offline';
export { buildSubjectPostBody } from './transports/subject-body';
export {
	C15T_POLICY_CONTRACT_HEADER,
	C15T_VERSION_HEADER,
	c15tProtocolHeaders,
	c15tVersionHeaders,
} from './transports/version-header';
export type {
	ConfirmedCoverage,
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	GlobalVendorList,
	HydrationRecords,
	HydrationResult,
	InitContext,
	InitResponse,
	InitResult,
	KernelActiveUI,
	KernelBranding,
	KernelConfig,
	KernelEvent,
	KernelIABAuthority,
	KernelIABState,
	KernelModel,
	KernelOverrides,
	KernelPrivacySignals,
	KernelTranslations,
	KernelTransport,
	KernelUser,
	Listener,
	LocationResponse,
	NonIABVendor,
	NoticeDismissResult,
	PolicyResolution,
	PolicyScopeMode,
	ResolvedPolicyRule,
	SaveInput,
	SavePayload,
	SaveResult,
	TranslationsResponse,
	Unsubscribe,
} from './types';

// -- Consent categories --------------------------------------------------------
export type {
	AllConsentNames,
	ConsentInfo,
	ConsentType,
} from './consent/consent-types';
export { allConsentNames, consentTypes } from './consent/consent-types';
export type {
	ConsentBannerResponse,
	LocationInfo,
	NamespaceProps,
} from './consent/compliance';

// -- Consent conditions --------------------------------------------------------
export type { HasCondition } from './libs/has';
export { extractConsentNamesFromCondition, has } from './libs/has';

// -- Storage -------------------------------------------------------------------
export type { CookieOptions, StorageConfig } from './libs/cookie';
export {
	deleteConsentFromStorage,
	deleteCookie,
	getCookie,
	getRootDomain,
	setCookie,
} from './libs/cookie';

// -- Blockers ------------------------------------------------------------------
export type {
	BlockedRequestInfo,
	NetworkBlockerConfig,
	NetworkBlockerRule,
} from './libs/network-blocker/types';
export type { IframeBlockerOptions } from './modules/iframe-blocker';

// -- Script loader -------------------------------------------------------------
export type {
	Script,
	ScriptCallbackInfo,
	ScriptDebugAction,
	ScriptDebugEvent,
	ScriptDebugEventInput,
	ScriptDebugListener,
	ScriptDebugScope,
	ScriptDebugSource,
	ScriptLifecycleCallback,
	ScriptUpdateResult,
} from './libs/script-loader/types';
export {
	emitScriptDebugEvent,
	subscribeToScriptDebugEvents,
} from './libs/script-loader/debug';

// -- Provider option types -----------------------------------------------------
export type {
	Callback,
	Callbacks,
	CMPApi,
	CMPApiConfig,
	CMPStatus,
	DisplayStatus,
	EventStatus,
	FetchGVLResult,
	IABConfig,
	LegalLink,
	LegalLinks,
	OnBannerFetchedPayload,
	OnChoiceRecordedPayload,
	OnPermissionsChangedPayload,
	OnErrorPayload,
	Overrides,
	PingData,
	PublisherRestriction,
	SSRInitialData,
	SSRInitRequestContext,
	SSRInitRequestMetadata,
	SSRSkippedReason,
	TCData,
	TCFConsentData,
	User,
} from './options';
export type { ActiveUI, Model } from './types';

// -- Prefetch ------------------------------------------------------------------
export type { PrefetchOptions } from './libs/prefetch';
export { buildPrefetchScript } from './libs/prefetch';

// -- Translations --------------------------------------------------------------
export type {
	CommonTranslations,
	ConsentManagerDialogTranslations,
	ConsentTypesTranslations,
	ConsentTypeTranslations,
	CookieBannerTranslations,
	I18nConfig,
	LegalLinksTranslations,
	TranslationConfig,
	Translations,
} from '@c15t/translations';
export {
	deepMergeTranslations,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	prepareTranslationConfig,
} from '@c15t/translations';
export { defaultTranslationConfig } from './translations';

// -- Schema re-exports ---------------------------------------------------------
export type {
	Branding,
	InitOutput,
	JurisdictionCode,
	PolicyPrompt,
	PolicyResolutionFailure,
	PolicyRule,
	PolicyRulePresets,
} from '@c15t/schema/types';
export {
	normalizePolicyRule,
	policyRulePresets,
	readPolicyResolutionWire,
	resolvePolicyRules,
	writePolicyResolutionWire,
	safeFallbackPolicyRule,
} from '@c15t/schema/types';
export { resolveConsentPresentation } from './libs/policy-actions';
export type {
	ConsentPresentation,
	PromptPresentation,
	PreferencesPresentation,
	SurfacePresentation,
	PresentationAction,
	PresentationDiagnostic,
	ResolvedConsentPresentation,
} from './libs/policy-actions';

export { evaluateConsent, getEffectiveGateState } from './modules/has';
