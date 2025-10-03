/**
 * @packageDocumentation
 * Central export point for all consent management types and interfaces.
 * This module aggregates and re-exports all type definitions needed for implementing
 * GDPR-compliant consent management.
 */

export type { ContractsInputs, ContractsOutputs } from '@c15t/backend';
/**
 * @module
 * Translation Types
 *
 * @remarks
 * Exports types for translation configuration and translations:
 * - Translation configuration
 * - Translation types
 * - Cookie banner translations
 * - Consent manager dialog translations
 * - Consent manager widget translations
 */
export type {
	CommonTranslations,
	ConsentManagerDialogTranslations,
	ConsentTypesTranslations,
	ConsentTypeTranslations,
	CookieBannerTranslations,
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
/**
 * @module
 * Client Types
 *
 * @remarks
 * Export client types and implementations
 */
// Export new client implementations as primary API
export * from './client';
// Export basic types directly for convenience
export type {
	FetchOptions,
	ResponseContext,
} from './client/types';
/**
 * @module
 * API Endpoints
 *
 * @remarks
 * Exports the API endpoints for the consent management system.
 */
export { API_ENDPOINTS } from './client/types';
export type { GTMConfiguration } from './libs/gtm';

export type { HasCondition } from './libs/has';
export {
	createIframeBlocker,
	type IframeBlocker,
	type IframeBlockerConfig,
} from './libs/iframe-blocker';
// Export script loader
export {
	getLoadedScriptIds,
	isScriptLoaded,
	loadScripts,
	type Script,
	unloadScripts,
	updateScripts,
} from './libs/script-loader';

export type { TrackingBlockerConfig } from './libs/tracking-blocker';
// Export tracking blocker
export { createTrackingBlocker } from './libs/tracking-blocker';
export type { StoreConfig, StoreOptions } from './store';
// Export store
export { createConsentManagerStore } from './store';
export type { PrivacyConsentState } from './store.type';
// Export default translation config
export { defaultTranslationConfig } from './translations';
export type { Callback, Callbacks } from './types/callbacks';
/**
 * @module
 * Compliance and Privacy Types
 *
 * @remarks
 * Exports types related to privacy compliance and consent management:
 * - Region-specific compliance settings
 * - Consent state tracking
 * - Privacy preferences
 * - Namespace configuration
 *
 * @example
 * Import compliance-related types:
 * ```typescript
 * import type {
 *   ComplianceRegion,
 *   ComplianceSettings,
 * } from 'c15t/types';
 *
 * const euSettings: ComplianceSettings = {
 *   enabled: true,
 *   appliesGlobally: false,
 *   applies: true
 * };
 *
 * const region: ComplianceRegion = 'gdpr';
 * ```
 */
export type {
	ComplianceRegion,
	ComplianceSettings,
	ConsentBannerResponse,
	ConsentState,
	HasConsentedProps,
	JurisdictionInfo,
	LocationInfo,
	NamespaceProps,
} from './types/compliance';
// Export compliance types
export * from './types/compliance';
/**
 * @module
 * GDPR Consent Types
 *
 * @remarks
 * Exports types and constants for GDPR-specific consent management:
 * - Consent category definitions
 * - Consent type configurations
 * - Predefined consent settings
 *
 * @example
 * Import and use GDPR-related types:
 * ```typescript
 * import {
 *   type AllConsentNames,
 *   type ConsentType,
 *   consentTypes
 * } from 'c15t/types';
 *
 * function isOptionalConsent(type: AllConsentNames): boolean {
 *   const config = consentTypes.find(c => c.name === type);
 *   return config ? !config.disabled && !config.defaultValue : false;
 * }
 * ```
 */
export {
	type AllConsentNames,
	allConsentNames,
	type ConsentType,
	consentTypes,
} from './types/gdpr';
