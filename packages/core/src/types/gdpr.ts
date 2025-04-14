/**
 * @packageDocumentation
 * Provides types and constants for managing GDPR-compliant consent categories and their configurations.
 */

/**
 * Defines all possible consent categories that can be managed within the application.
 *
 * @remarks
 * Each consent type represents a specific category of data processing:
 *
 * - `necessary`: Essential cookies required for basic site functionality
 * - `functionality`: Cookies that enable enhanced features and personalization
 * - `marketing`: Cookies used for advertising and marketing purposes
 * - `measurement`: Analytics and performance measurement cookies
 * - `experience`: Cookies that improve user experience and interactions
 *
 * @example
 * ```typescript
 * function isConsentRequired(type: AllConsentNames): boolean {
 *   return type !== 'necessary';
 * }
 *
 * function enableFeature(type: AllConsentNames, hasConsent: boolean) {
 *   switch (type) {
 *     case 'marketing':
 *       hasConsent ? enableAds() : disableAds();
 *       break;
 *     case 'measurement':
 *       hasConsent ? enableAnalytics() : disableAnalytics();
 *       break;
 *     // ... handle other types
 *   }
 * }
 * ```
 *
 * @public
 */
export type AllConsentNames =
	| 'experience'
	| 'functionality'
	| 'marketing'
	| 'measurement'
	| 'necessary';

/**
 * Defines the configuration structure for each consent type.
 *
 * @remarks
 * Each consent type has specific properties that determine its behavior:
 *
 * - `defaultValue`: Initial consent state
 *   - `true`: Consent is granted by default (typically only for 'necessary' cookies)
 *   - `false`: Subject must explicitly grant consent
 *
 * - `description`: Subject-friendly explanation of the consent category
 *   - Should be clear and concise
 *   - Must accurately describe data usage
 *   - Should help users make informed decisions
 *
 * - `disabled`: Whether users can modify this consent
 *   - `true`: Users cannot change the consent state (e.g., necessary cookies)
 *   - `false` or `undefined`: Users can toggle consent
 *
 * - `display`: Visibility in consent UI
 *   - `true`: Show this option to users
 *   - `false`: Hide from consent interface
 *
 * - `gdprType`: Numeric identifier for GDPR categorization
 *   - 1: Essential/Necessary
 *   - 2: Functional
 *   - 3: Experience/Preferences
 *   - 4: Analytics/Measurement
 *   - 5: Marketing/Advertising
 *
 * - `name`: Reference to the consent type
 *   - Must match one of {@link AllConsentNames}
 *
 * @example
 * ```typescript
 * const analyticsConsent: ConsentType = {
 *   name: 'measurement',
 *   gdprType: 4,
 *   defaultValue: false,
 *   description: 'Helps us understand how users interact with our site',
 *   display: true,
 *   disabled: false
 * };
 *
 * const necessaryConsent: ConsentType = {
 *   name: 'necessary',
 *   gdprType: 1,
 *   defaultValue: true,
 *   description: 'Required for basic site functionality',
 *   display: true,
 *   disabled: true  // Users cannot disable necessary cookies
 * };
 * ```
 *
 * @see {@link consentTypes} for the predefined consent configurations
 * @public
 */
export type ConsentType = {
	/** Whether consent is granted by default */
	defaultValue: boolean;

	/** Subject-friendly description of what this consent enables */
	description: string;

	/** Whether users can modify this consent setting */
	disabled?: boolean;

	/** Whether to show this consent option in the UI */
	display: boolean;

	/** GDPR category identifier (1-5) */
	gdprType: number;

	/** The consent category name */
	name: AllConsentNames;
};

/**
 * Predefined consent type configurations that comply with GDPR requirements.
 *
 * @remarks
 * This array defines the standard consent categories and their default configurations.
 * Each entry represents a specific type of cookie or tracking technology:
 *
 * 1. Necessary (Type 1):
 *    - Required for basic site functionality
 *    - Cannot be disabled by users
 *    - Enabled by default
 *
 * 2. Functionality (Type 2):
 *    - Enables enhanced features
 *    - Optional for users
 *    - Disabled by default
 *
 * 3. Measurement (Type 4):
 *    - Analytics and performance tracking
 *    - Optional for users
 *    - Disabled by default
 *
 * 4. Experience (Type 3):
 *    - Subject experience improvements
 *    - Optional for users
 *    - Disabled by default
 *
 * 5. Marketing (Type 5):
 *    - Advertising and marketing
 *    - Optional for users
 *    - Disabled by default
 *
 * @example
 * ```typescript
 * function getConsentConfig(type: AllConsentNames): ConsentType {
 *   return consentTypes.find(consent => consent.name === type)!;
 * }
 *
 * function isConsentRequired(type: AllConsentNames): boolean {
 *   const config = getConsentConfig(type);
 *   return !config.defaultValue && !config.disabled;
 * }
 *
 * function getDisplayedConsents(): ConsentType[] {
 *   return consentTypes.filter(consent => consent.display);
 * }
 * ```
 *
 * @see {@link ConsentType} for the structure of each consent configuration
 * @see {@link AllConsentNames} for available consent categories
 * @public
 */
export const consentTypes: ConsentType[] = [
	{
		defaultValue: true,
		description:
			'These trackers are used for activities that are strictly necessary to operate or deliver the service you requested from us and, therefore, do not require you to consent.',
		disabled: true,
		display: true,
		gdprType: 1,
		name: 'necessary',
	},
	{
		defaultValue: false,
		description:
			'These trackers enable basic interactions and functionalities that allow you to access selected features of our service and facilitate your communication with us.',
		display: false,
		gdprType: 2,
		name: 'functionality',
	},
	{
		defaultValue: false,
		description:
			'These trackers help us to measure traffic and analyze your behavior to improve our service.',
		display: false,
		gdprType: 4,
		name: 'measurement',
	},
	{
		defaultValue: false,
		description:
			'These trackers help us to improve the quality of your user experience and enable interactions with external content, networks, and platforms.',
		display: false,
		gdprType: 3,
		name: 'experience',
	},
	{
		defaultValue: false,
		description:
			'These trackers help us to deliver personalized ads or marketing content to you, and to measure their performance.',
		display: false,
		gdprType: 5,
		name: 'marketing',
	},
];
