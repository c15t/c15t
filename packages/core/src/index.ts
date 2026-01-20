/**
 * @packageDocumentation
 * Central export point for all consent management types and interfaces.
 * This module aggregates and re-exports all type definitions needed for implementing
 * GDPR-compliant consent management.
 */

// Export schema types directly for new code
export type {
	Branding,
	IdentifyUserInput,
	IdentifyUserOutput,
	InitOutput,
	JurisdictionCode,
	PostConsentInput,
	PostConsentOutput,
	VerifyConsentInput,
	VerifyConsentOutput,
} from '@c15t/schema/types';
export type {
	CommonTranslations,
	ConsentManagerDialogTranslations,
	ConsentTypesTranslations,
	ConsentTypeTranslations,
	CookieBannerTranslations,
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
export {
	type ConsentManagerInterface,
	type ConsentManagerOptions,
	configureConsentManager,
} from './client';
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
export type { HasCondition } from './libs/has';
export {
	createIframeBlocker,
	type IframeBlocker,
	type IframeBlockerConfig,
} from './libs/iframe-blocker';
export type { NetworkBlockerConfig } from './libs/network-blocker';
// Export script loader
export {
	getLoadedScriptIds,
	isScriptLoaded,
	loadScripts,
	type Script,
	unloadScripts,
	updateScripts,
} from './libs/script-loader';
// Export store
export { createConsentManagerStore } from './store';
export type {
	ConsentStoreState,
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
export * from './types/compliance';
export {
	type AllConsentNames,
	allConsentNames,
	type ConsentType,
	consentTypes,
} from './types/gdpr';
export type { Overrides } from './types/index';
export type { LegalLink, LegalLinks } from './types/legal-links';
export type { User } from './types/user';
