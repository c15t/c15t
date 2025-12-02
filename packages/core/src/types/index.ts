/**
 * @packageDocumentation
 * Central export point for all consent management types and interfaces.
 * This module aggregates and re-exports all type definitions needed for implementing
 * GDPR-compliant consent management.
 */

export type { Callback, Callbacks } from './callbacks';

export type {
	ConsentBannerResponse,
	ConsentState,
	JurisdictionInfo,
	LocationInfo,
	NamespaceProps,
} from './compliance';
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
	type ConsentInfo,
	type ConsentType,
	consentTypes,
} from './gdpr';

export type { User } from './user';

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

export * from './compliance';
export * from './legal-links';

export type Overrides = {
	/**
	 * Country code to forcefully set
	 * @example 'DE'
	 */
	country?: string;
	/**
	 * Region code to forcefully set
	 * @example 'BE'
	 */
	region?: string;
	/**
	 * Language code to forcefully set
	 * @example 'de-DE'
	 */
	language?: string;
};
