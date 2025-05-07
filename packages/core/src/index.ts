/**
 * @packageDocumentation
 * Central export point for all consent management types and interfaces.
 * This module aggregates and re-exports all type definitions needed for implementing
 * GDPR-compliant consent management.
 */

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
 *   PrivacySettings
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
	PrivacySettings,
} from './types/compliance';

/**
 * @module
 * API Endpoints
 *
 * @remarks
 * Exports the API endpoints for the consent management system.
 */
export { API_ENDPOINTS } from './client/types';
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
	type ConsentType,
	consentTypes,
} from './types/gdpr';

/**
 * @module
 * Callback Types
 *
 * @remarks
 * Exports types for consent management callbacks and event handlers:
 * - Generic callback function type
 * - Consent-specific callback configurations
 *
 * @example
 * Import and use callback types:
 * ```typescript
 * import type {
 *   CallbackFunction,
 *   Callbacks
 * } from 'c15t/types';
 *
 * const callbacks: Callbacks = {
 *   onConsentGiven: () => {
 *     console.log('Consent granted');
 *     initializeAnalytics();
 *   },
 *   onError: (error) => {
 *     console.error('Consent error:', error);
 *   }
 * };
 * ```
 *
 * @example
 * Create typed callback functions:
 * ```typescript
 * const errorHandler: CallbackFunction<string> =
 *   (message) => console.error(message);
 *
 * const readyHandler: CallbackFunction =
 *   () => console.log('System ready');
 * ```
 */
export type { CallbackFunction, Callbacks } from './types/callbacks';

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
	ConsentManagerDialogTranslations,
	ConsentManagerWidgetTranslations,
	ConsentTypeTranslations,
	ConsentTypesTranslations,
	CookieBannerTranslations,
	TranslationConfig,
	Translations,
} from './types/translations';

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

// Export compliance types
export * from './types/compliance';

// Export store
export { createConsentManagerStore } from './store';
export type { StoreConfig, StoreOptions } from './store';
export type { PrivacyConsentState } from './store.type';

// Export tracking blocker
export { createTrackingBlocker } from './libs/tracking-blocker';
export type { TrackingBlockerConfig } from './libs/tracking-blocker';

// Export default translation config
export { defaultTranslationConfig } from './translations';

// Export translation utilities
export {
	deepMergeTranslations,
	mergeTranslationConfigs,
	detectBrowserLanguage,
	prepareTranslationConfig,
} from './utils/translations';
