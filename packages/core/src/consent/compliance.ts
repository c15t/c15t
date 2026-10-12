import type { AllConsentNames } from './consent-types';
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
export interface NamespaceProps {
	/**
	 * Global namespace for the consent manager store.
	 *
	 * @defaultValue "c15tStore"
	 */
	namespace?: string;
}
