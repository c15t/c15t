/**
 * @packageDocumentation
 * Central export point for all consent management types and interfaces.
 * This module aggregates and re-exports all type definitions needed for implementing
 * GDPR-compliant consent management.
 */

// Export schema types directly for new code
export type {
	Branding,
	EuropePolicyMode,
	GetSubjectInput,
	GetSubjectOutput,
	GlobalVendorList,
	InitOutput,
	JurisdictionCode,
	ListSubjectsOutput,
	ListSubjectsQuery,
	PatchSubjectFullInput,
	PatchSubjectOutput,
	PolicyConfig,
	PolicyPackPresets,
	PostSubjectInput,
	PostSubjectOutput,
} from '@c15t/schema/types';
export { policyPackPresets } from '@c15t/schema/types';
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
// Export translation utilities
export {
	deepMergeTranslations,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	prepareTranslationConfig,
} from '@c15t/translations';
export * from './client';
// Export basic types directly for convenience
export type {
	FetchOptions,
	ResponseContext,
} from './client/types';
export { API_ENDPOINTS } from './client/types';
// Export cookie storage utilities
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
export type { Model } from './libs/determine-model';
export {
	generateSubjectId,
	isValidSubjectId,
} from './libs/generate-subject-id';
export type { HasCondition, HasOptions } from './libs/has';
export { has } from './libs/has';
export type {
	CMPApi,
	CMPApiConfig,
	FetchGVLResult,
	IABActions,
	IABConfig,
	IABManager,
	IABModule,
	IABState,
} from './libs/iab-tcf/types';
export {
	createIframeBlocker,
	type IframeBlocker,
	type IframeBlockerConfig,
} from './libs/iframe-blocker';
export type { NetworkBlockerConfig } from './libs/network-blocker';
export {
	applyPolicyPurposeAllowlist,
	applyPolicyScopeForRuntimeGating,
	filterConsentCategoriesByPolicy,
	getEffectivePolicy,
	type PolicyUIState,
	type PolicyValidationIssue,
	validateUIAgainstPolicy,
} from './libs/policy';
export type { PrefetchOptions } from './libs/prefetch';
// Export prefetch utilities
export {
	buildPrefetchScript,
	ensurePrefetchedInitialData,
	getPrefetchedInitialData,
} from './libs/prefetch';
// Export script loader
export {
	getLoadedScriptIds,
	isScriptLoaded,
	loadScripts,
	type Script,
	unloadScripts,
	updateScripts,
} from './libs/script-loader';
export {
	type ConsentRuntimeOptions,
	type ConsentRuntimePkgInfo,
	type ConsentRuntimeResult,
	clearConsentRuntimeCache,
	getOrCreateConsentRuntime,
} from './runtime';
// Export store
export { createConsentManagerStore } from './store';
export type {
	ActiveUI,
	ConsentStoreState,
	InitDataSource,
	OfflinePolicyConfig,
	PolicyScopeMode,
	PolicySurfaceState,
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
	SSRInitialData,
	SSRInitRequestMetadata,
	StoreOptions,
} from './store/type';
// Export default translation config
export { defaultTranslationConfig } from './translations';
export type { Callback, Callbacks } from './types/callbacks';
export type {
	ConsentBannerResponse,
	ConsentState,
	LocationInfo,
	NamespaceProps,
} from './types/compliance';
export {
	type AllConsentNames,
	allConsentNames,
	type ConsentType,
	consentTypes,
} from './types/consent-types';
export type { Overrides } from './types/index';
export type { LegalLink, LegalLinks } from './types/legal-links';
export type { User } from './types/user';
