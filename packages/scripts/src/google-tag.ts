import type { AllConsentNames, Script } from 'c15t';

import {
	DEFAULT_GTM_CONSENT_CONFIG,
	mapConsentStateToGTM,
} from './google-tag-manager';

// Extended Window interface to include gtag specific properties
declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

export interface GtagOptions {
	/**
	 * Your gtag id
	 * @example `G-XXXXXXX`
	 */
	id: string;

	/**
	 * The consent category to use for the gtag script. This is typically marketing (Ads & Floodlight) or measurement (Analytics)
	 * @example 'marketing'
	 */
	category: AllConsentNames;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'gtag'
	 * - `src`: `https://www.googletagmanager.com/gtag/js?id=${id}`
	 * - `async`: true
	 */
	script?: Partial<Omit<Script, 'category'>>;
}

/**
 * Creates a Google Tag (gtag.js) script.
 * Allows you to send data website to linked Google products like Analytics, Ads & Floodlight.
 *
 * @param options - The options for the gtag script.
 * @returns The Google Tag Manager script.
 */
export function gtag({ id, script, category }: GtagOptions): Script {
	return {
		...script,
		id: script?.id ? script.id : 'gtag',
		src: script?.src
			? script.src
			: `https://www.googletagmanager.com/gtag/js?id=${id}`,
		category: category,
		async: script?.async ?? true,
		persistAfterConsentRevoked: true,
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
 		window.gtag('js', new Date());
		window.gtag('config', '${id}');
  `;

			if (!document.head) {
				throw new Error('Document head is not available for script injection');
			}

			document.head.appendChild(setupScript);

			if (script?.onBeforeLoad) {
				script.onBeforeLoad({ consents, elementId, ...rest });
			}
		},
		onConsentChange(args) {
			if (window.gtag) {
				window.gtag('consent', 'update', mapConsentStateToGTM(args.consents));
			}

			if (script?.onConsentChange) {
				script.onConsentChange(args);
			}
		},
	};
}
