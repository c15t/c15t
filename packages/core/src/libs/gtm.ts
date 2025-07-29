import type { AllConsentNames, ConsentState } from '../types';

/**
 * GTM-specific consent configuration matching Google's consent mode API
 */
interface GTMConsentConfiguration {
	ad_storage: 'granted' | 'denied';
	ad_personalization: 'granted' | 'denied';
	ad_user_data: 'granted' | 'denied';
	analytics_storage: 'granted' | 'denied';
	personalization_storage: 'granted' | 'denied';
	functionality_storage: 'granted' | 'denied';
	security_storage: 'granted' | 'denied';
}

interface Options {
	/**
	 * Your Google Tag Manager container ID. Begins with 'GTM-'.
	 */
	id: string;
	/**
	 * Custom URL for your GTM script. Include the 'id' parameter.
	 *
	 * @default `https://www.googletagmanager.com/gtm.js?id=${id}`
	 *
	 * @example
	 * ```ts
	 * https://www.c15t.dev/gtm.js?id=GTM-XXXXXXX
	 * ```
	 */
	customScriptUrl?: string;

	/**
	 * The consent state to use for the GTM consent configuration.
	 */
	consentState?: ConsentState;
}

export type GTMConfiguration = Omit<Options, 'consentState'>;

/**
 * Extended Window interface to include GTM-specific properties
 */
declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

/**
 * Default GTM consent configuration that denies all tracking
 */
const DEFAULT_GTM_CONSENT_CONFIG: GTMConsentConfiguration = {
	functionality_storage: 'denied',
	security_storage: 'denied',
	analytics_storage: 'denied',
	ad_storage: 'denied',
	ad_user_data: 'denied',
	ad_personalization: 'denied',
	personalization_storage: 'denied',
} as const;

const CONSENT_STATE_TO_GTM_MAPPING: Record<
	AllConsentNames,
	(keyof GTMConsentConfiguration)[]
> = {
	necessary: ['security_storage'],
	functionality: ['functionality_storage'],
	measurement: ['analytics_storage'],
	marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
	experience: ['personalization_storage'],
} as const;

/**
 * Converts ConsentState to GTM consent configuration
 *
 * @param consentState - The application's consent state
 * @returns GTM-compatible consent configuration
 *
 * @see {@link CONSENT_STATE_TO_GTM_MAPPING} for the mapping logic
 */
export function mapConsentStateToGTM(
	consentState: ConsentState
): GTMConsentConfiguration {
	const gtmConfig: GTMConsentConfiguration = { ...DEFAULT_GTM_CONSENT_CONFIG };

	// Map each consent type to its corresponding GTM consent categories
	for (const consentType of Object.keys(consentState) as AllConsentNames[]) {
		const isGranted = consentState[consentType];
		const gtmConsentTypes = CONSENT_STATE_TO_GTM_MAPPING[consentType];

		for (const gtmType of gtmConsentTypes) {
			gtmConfig[gtmType] = isGranted ? 'granted' : 'denied';
		}
	}

	return gtmConfig;
}

/**
 * Initializes the Google Tag Manager dataLayer and consent configuration
 *
 * @param configuration - GTM setup configuration options
 *
 * @throws {Error} When GTM container ID is empty or invalid
 *
 * @internal This function should be called before loading the GTM script
 */
export function initializeGTMDataLayer(gtm: Options) {
	const gtmConsent = gtm.consentState
		? mapConsentStateToGTM(gtm.consentState)
		: DEFAULT_GTM_CONSENT_CONFIG;

	const gtmSetupScript = document.createElement('script');

	gtmSetupScript.textContent = `
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('consent', 'default', {
      ...${JSON.stringify(gtmConsent)},
    });
    window.dataLayer.push({
      'gtm.start': Date.now(),
      event: 'gtm.js',
    });
  `;

	if (!document.head) {
		throw new Error('Document head is not available for script injection');
	}

	document.head.appendChild(gtmSetupScript);
}

/**
 * Creates and injects the Google Tag Manager script into the document head
 *
 * @param gtmContainerId - The GTM container ID (e.g., 'GTM-XXXXXXX')
 *
 * @throws {Error} When script injection fails
 *
 * @see {@link initializeGTMDataLayer} - Should be called before this function
 */
export function createGTMScript(gtm: Options) {
	const gtmScript = document.createElement('script');
	gtmScript.async = true;
	gtmScript.src = gtm.customScriptUrl
		? gtm.customScriptUrl
		: `https://www.googletagmanager.com/gtm.js?id=${gtm.id}`;

	if (!document.head) {
		throw new Error('Document head is not available for script injection');
	}

	document.head.appendChild(gtmScript);
}

/**
 * Complete Google Tag Manager setup including dataLayer initialization and script injection
 *
 * @param configuration - Complete GTM configuration options
 *
 * @throws {Error} When GTM container ID is empty or invalid
 * @throws {Error} When script injection fails
 *
 * @see {@link initializeGTMDataLayer} - For dataLayer setup only
 * @see {@link createGTMScript} - For script injection only
 */
export function setupGTM(gtm: Options): void {
	const id = gtm.id;

	if (!id || id.trim().length === 0) {
		throw new Error(
			'GTM container ID is required and must be a non-empty string'
		);
	}

	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return;
	}

	initializeGTMDataLayer(gtm);
	createGTMScript(gtm);
}

/**
 * Updates the Google Tag Manager consent configuration
 *
 * @param consentState - The consent state to update
 */
export function updateGTMConsent(consentState: ConsentState): void {
	if (!window.gtag) {
		return;
	}

	window.gtag('consent', 'update', mapConsentStateToGTM(consentState));
}
