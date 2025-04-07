/**
 * @packageDocumentation
 * Main entry point for the c15t consent management system.
 */

// Re-export store
export { createConsentManagerStore, type StoreConfig } from './store';
export type { PrivacyConsentState } from './store.type';

// Re-export all utilities
export * from './libs/consent-utils';
export { createTrackingBlocker } from './libs/tracking-blocker';
export type { TrackingBlockerConfig } from './libs/tracking-blocker';

// Re-export types and constants
export { consentTypes } from './types';
export type {
	CallbackFunction,
	Callbacks,
	AllConsentNames,
	ConsentType,
	ConsentState,
	ComplianceRegion,
	ComplianceSettings,
	PrivacySettings,
	HasConsentedProps,
	NamespaceProps,
	TranslationConfig,
	Translations,
	CookieBannerTranslations,
	ConsentManagerDialogTranslations,
	ConsentManagerWidgetTranslations,
	ConsentTypeTranslations,
	ConsentTypesTranslations,
	LocationInfo,
	JurisdictionInfo,
	ConsentBannerResponse,
} from './types';

// Export the client
export { c15tClient, createConsentClient } from './client';

// Re-export client types
export type {
	FetchOptions,
	ResponseContext,
	c15tClientOptions,
	c15tClientPlugin,
} from './types/client';

export { defaultTranslationConfig } from './translations';
