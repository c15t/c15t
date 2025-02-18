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
 * Defines supported privacy regulation frameworks and regions.
 *
 * @remarks
 * Each region represents a different privacy regulation framework:
 * - `gdpr`: European Union's General Data Protection Regulation
 * - `ccpa`: California Consumer Privacy Act
 * - `lgpd`: Brazil's Lei Geral de Proteção de Dados
 * - `usStatePrivacy`: Other U.S. state privacy laws (e.g., VCDPA, CPA)
 *
 * @example
 * ```typescript
 * function isRegionCompliant(region: ComplianceRegion): boolean {
 *   switch (region) {
 *     case 'gdpr':
 *       return checkGDPRCompliance();
 *     case 'ccpa':
 *       return checkCCPACompliance();
 *     // ... handle other regions
 *   }
 * }
 * ```
 *
 * @public
 */
export type ComplianceRegion = 'gdpr' | 'ccpa' | 'lgpd' | 'usStatePrivacy';

/**
 * Configuration settings for privacy regulation compliance.
 *
 * @remarks
 * These settings determine how privacy regulations are enforced:
 * - `enabled`: Activates or deactivates the compliance framework
 * - `appliesGlobally`: Whether to apply these rules worldwide
 * - `applies`: Whether the regulation applies in the current context
 *
 * @example
 * ```typescript
 * const gdprSettings: ComplianceSettings = {
 *   enabled: true,              // GDPR compliance is active
 *   appliesGlobally: false,     // Only applies to EU users
 *   applies: isEUUser()         // Dynamically check if user is in EU
 * };
 *
 * const ccpaSettings: ComplianceSettings = {
 *   enabled: true,
 *   appliesGlobally: false,
 *   applies: isCaliforniaUser() // Check if user is in California
 * };
 * ```
 *
 * @see {@link ComplianceRegion} for available regions
 * @public
 */
export type ComplianceSettings = {
	/** Whether the compliance framework is active */
	enabled: boolean;

	/** Whether to apply compliance rules globally */
	appliesGlobally: boolean;

	/** Whether the regulation applies in current context */
	applies: boolean | undefined;
};

/**
 * User privacy preference configuration.
 *
 * @remarks
 * Contains settings that affect how user privacy preferences are handled:
 * - `honorDoNotTrack`: Respects the browser's DNT (Do Not Track) setting
 *
 * When `honorDoNotTrack` is true and the user has enabled DNT in their browser:
 * - All non-essential tracking will be disabled
 * - Only necessary cookies will be allowed
 * - Analytics and marketing features will be disabled
 *
 * @example
 * ```typescript
 * const privacySettings: PrivacySettings = {
 *   honorDoNotTrack: true // Respect browser's DNT setting
 * };
 *
 * function shouldTrack(): boolean {
 *   return !(
 *     privacySettings.honorDoNotTrack &&
 *     navigator.doNotTrack === "1"
 *   );
 * }
 * ```
 *
 * @public
 */
export type PrivacySettings = {
	/** Whether to respect the browser's Do Not Track setting */
	honorDoNotTrack: boolean;
};

/**
 * Records information about a user's consent decision.
 *
 * @remarks
 * This type tracks when and how consent was given:
 * - `time`: Unix timestamp of when consent was given
 * - `type`: The scope of consent granted
 *   - `'all'`: Accepted all consent types
 *   - `'custom'`: Selected specific consent types
 *   - `'necessary'`: Only accepted necessary cookies
 *
 * Can be `null` if no consent has been recorded yet.
 *
 * @example
 * ```typescript
 * // User accepted all cookies
 * const fullConsent: HasConsentedProps = {
 *   time: Date.now(),
 *   type: 'all'
 * };
 *
 * // User customized their consent
 * const customConsent: HasConsentedProps = {
 *   time: Date.now(),
 *   type: 'custom'
 * };
 *
 * // No consent recorded yet
 * const noConsent: HasConsentedProps = null;
 * ```
 *
 * @public
 */
export type HasConsentedProps = {
	/** Timestamp when consent was given */
	time: number;

	/** Type of consent granted */
	type: 'all' | 'custom' | 'necessary';
} | null;

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
