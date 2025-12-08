import type { ContractsOutputs } from '@c15t/backend/contracts';
import type { AllConsentNames } from './gdpr';
/**
 * @packageDocumentation
 * Provides types and interfaces for managing privacy compliance and consent across different regulatory frameworks.
 */

/**
 * Represents the state of consents for different types of data processing.
 *
 * @remarks
 * Maps each consent type to a boolean indicating whether consent has been granted.
 * The consent types are defined by {@link AllConsentNames} and typically include
 * categories like 'necessary', 'functional', 'analytics', etc.
 *
 * @example
 * ```typescript
 * const consentState: ConsentState = {
 *   necessary: true,    // Required functionality
 *   functional: true,   // Enhanced features
 *   analytics: false,   // Usage tracking
 *   marketing: false    // Marketing cookies
 * };
 * ```
 *
 * @public
 */
export type ConsentState = Record<AllConsentNames, boolean>;

/**
 * Configuration for the consent manager's namespace.
 *
 * @remarks
 * The namespace is used to:
 * - Isolate consent manager instances
 * - Prevent conflicts with other global variables
 * - Support multiple consent managers on the same page
 * - Maintain state persistence across page loads
 *
 * @example
 * ```typescript
 * // Basic usage with default namespace
 * const defaultConfig: NamespaceProps = {};
 *
 * // Custom namespace for multiple instances
 * const customConfig: NamespaceProps = {
 *   namespace: 'MyAppConsent'
 * };
 *
 * // Multiple consent managers
 * const configs = {
 *   main: { namespace: 'MainAppConsent' },
 *   subsite: { namespace: 'SubsiteConsent' }
 * };
 * ```
 *
 * @public
 */
export type NamespaceProps = {
	/**
	 * Global namespace for the consent manager store.
	 *
	 * @defaultValue "c15tStore"
	 */
	namespace?: string;
};

/**
 * Represents location information for the user.
 *
 * @remarks
 * Contains country and region codes to determine applicable privacy regulations.
 *
 * @example
 * ```typescript
 * const location: LocationInfo = {
 *   countryCode: 'GB',
 *   regionCode: 'ENG'
 * };
 * ```
 *
 * @public
 */
export type LocationInfo = {
	/** ISO country code (e.g., 'US', 'GB', 'DE') */
	countryCode: string | null;

	/** Region or state code within the country (e.g., 'CA', 'ENG') */
	regionCode: string | null;

	/** Jurisdiction code (e.g. 'GDPR') */
	jurisdiction:
		| ContractsOutputs['consent']['showBanner']['jurisdiction']
		| null;
};

/**
 * Response from the consent banner API.
 *
 * @remarks
 * Contains information about whether to show the consent banner and why.
 *
 * @example
 * ```typescript
 * const response: ConsentBannerResponse = {
 *   showConsentBanner: true,
 *   jurisdiction: {
 *     code: 'GDPR',
 *     message: 'GDPR or equivalent regulations require a cookie banner.'
 *   },
 *   location: {
 *     countryCode: 'GB',
 *     regionCode: 'ENG'
 *   }
 * };
 * ```
 *
 * @public
 */
export type ConsentBannerResponse = ContractsOutputs['consent']['showBanner'];
