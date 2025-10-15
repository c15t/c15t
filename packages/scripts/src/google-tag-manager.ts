import type { AllConsentNames, ConsentState, Script } from 'c15t';

// Extended Window interface to include GTM-specific properties
declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

// GTM-specific consent configuration matching Google's consent mode API
interface GTMConsentConfiguration {
	ad_storage: 'granted' | 'denied';
	ad_personalization: 'granted' | 'denied';
	ad_user_data: 'granted' | 'denied';
	analytics_storage: 'granted' | 'denied';
	personalization_storage: 'granted' | 'denied';
	functionality_storage: 'granted' | 'denied';
	security_storage: 'granted' | 'denied';
}

// Default GTM consent configuration that denies all tracking
export const DEFAULT_GTM_CONSENT_CONFIG: GTMConsentConfiguration = {
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

export interface GoogleTagManagerOptions {
	/**
	 * Your Google Tag Manager container ID. Begins with 'GTM-'.
	 * @example `GTM-1234XXX`
	 */
	id: string;

	/**
	 * Update Event Name
	 * A custom event name used as a trigger to load your script once the consent has been updated.
	 *
	 * @default 'consent-update'
	 * @example 'consent-update'
	 */
	updateEventName?: string;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'google-tag-manager'
	 * - `src`: `https://www.googletagmanager.com/gtm.js?id=${id}`
	 * - `category`: 'necessary' (You control what scripts get loaded via Google Tag Manager)
	 * - `alwaysLoad`: true
	 * - `async`: true
	 */
	script?: Partial<Script>;
}

/**
 * Creates a Google Tag Manager script.
 * GTM can be used for managing the consent of other scripts via Google Tag Manager consent mode.
 * We recommend using c15t's script loader instead so your script logic is centralised.
 *
 * @param options - The options for the Google Tag Manager script.
 * @returns The Google Tag Manager script.
 */
export function googleTagManager({
	id,
	script,
	updateEventName,
}: GoogleTagManagerOptions): Script {
	return {
		...script,
		id: script?.id ? script.id : 'google-tag-manager',
		src: script?.src
			? script.src
			: `https://www.googletagmanager.com/gtm.js?id=${id}`,
		category: script?.category ?? 'necessary',
		async: script?.async ?? true,
		alwaysLoad: true,

		/**
		 * Instead of adding another script for the script loader, we will manage it internally for this script.
		 * This ensures the initialisation is done before the script is loaded.
		 */
		onBeforeLoad: ({ consents, elementId, ...rest }) => {
			const gtmConsent = consents
				? mapConsentStateToGTM(consents)
				: DEFAULT_GTM_CONSENT_CONFIG;

			const setupScript = document.createElement('script');

			setupScript.id = `${elementId}-init`;

			setupScript.textContent = `
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

			document.head.appendChild(setupScript);

			if (script?.onBeforeLoad) {
				script.onBeforeLoad({ consents, elementId, ...rest });
			}
		},
		onDelete: ({ elementId, ...rest }) => {
			const setupScript = document.getElementById(
				`${elementId}-init`
			) as HTMLScriptElement;

			if (setupScript) {
				setupScript.remove();
			}

			if (script?.onDelete) {
				script.onDelete({ elementId, ...rest });
			}
		},
		onConsentChange({ consents, ...rest }) {
			if (window.gtag) {
				window.gtag('consent', 'update', mapConsentStateToGTM(consents));
				window.gtag('event', updateEventName ?? 'consent-update');
			}

			if (script?.onConsentChange) {
				script.onConsentChange({ consents, ...rest });
			}
		},
	};
}
