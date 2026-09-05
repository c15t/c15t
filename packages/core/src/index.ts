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

export {
	DEFAULT_POLICY_ACTION_LAYOUT,
	flattenPolicyActionGroups,
	hasPolicyHints,
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyDirection,
	resolvePolicyOrderedActions,
	resolvePolicyPrimaryActions,
	resolvePolicyUiProfile,
	shouldFillPolicyActions,
} from './libs/policy-actions';
export type { CONSENT_CATEGORY, Consent } from './consent-record';
export {
	CONSENT_CATEGORIES,
	deriveActiveConsentUi,
	getConsentAvailableCategories,
	interpretStoredConsent,
} from './consent-record';
export { createConsentKernel } from './kernel';
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
export type { OfflineTransportOptions } from './transports/offline';
export { createOfflineTransport } from './transports/offline';
export { buildSubjectPostBody } from './transports/subject-body';
export {
	C15T_VERSION_HEADER,
	c15tVersionHeaders,
} from './transports/version-header';
export type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	GlobalVendorList,
	InitContext,
	InitResponse,
	InitResult,
	KernelActiveUI,
	KernelBranding,
	KernelConfig,
	KernelEvent,
	KernelIABState,
	KernelModel,
	KernelOverrides,
	KernelTranslations,
	KernelTransport,
	KernelUser,
	Listener,
	LocationResponse,
	NonIABVendor,
	PolicyDecision,
	PolicyScopeMode,
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiMode,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
	ResolvedPolicy,
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
export type { HasCondition, HasOptions } from './libs/has';
export { extractConsentNamesFromCondition, has } from './libs/has';

// -- Storage -------------------------------------------------------------------
export type { CookieOptions, StorageConfig } from './libs/cookie';
export {
	deleteConsentFromStorage,
	deleteCookie,
	getConsentFromStorage,
	getCookie,
	getRootDomain,
	saveConsentToStorage,
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
	OfflinePolicyConfig,
	OnBannerFetchedPayload,
	OnConsentChangedPayload,
	OnConsentSetPayload,
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
	EuropePolicyMode,
	InitOutput,
	JurisdictionCode,
	PolicyConfig,
	PolicyPackPresets,
} from '@c15t/schema/types';
export { policyPackPresets } from '@c15t/schema/types';
