import type { AllConsentNames, Script } from 'c15t';
import { applyScriptOverrides, resolveManifest } from './resolve';
import type { VendorManifest } from './types';

// Extended Window interface to include gtag specific properties
declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

/**
 * Google Tag (gtag.js) vendor manifest.
 *
 * Similar to GTM but for direct Google product integration (Analytics, Ads, Floodlight).
 * Uses the same Consent Mode v2 mapping.
 */
export const gtagManifest = {
	vendor: 'gtag',
	category: 'measurement', // overridden by user's category option
	alwaysLoad: true,
	persistAfterConsentRevoked: true,
	bootstrap: [
		{
			type: 'inlineScript',
			code: `
window.dataLayer = window.dataLayer || [];
window.gtag = function gtag() { window.dataLayer.push(arguments); };
			`.trim(),
		},
	],
	install: [
		{
			type: 'inlineScript',
			code: `
window.gtag('js', new Date());
window.gtag('config', '{{id}}');
			`.trim(),
		},
		{
			type: 'loadScript',
			src: 'https://www.googletagmanager.com/gtag/js?id={{id}}',
			async: true,
		},
	],
	consentMapping: {
		necessary: ['security_storage'],
		functionality: ['functionality_storage'],
		measurement: ['analytics_storage'],
		marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
		experience: ['personalization_storage'],
	},
	consentSignal: 'gtag',
} as const satisfies VendorManifest;

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
	 * - `alwaysLoad`: true
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
	const resolved = resolveManifest(gtagManifest, { id });

	// Override category from user option
	resolved.category = category;

	return script
		? applyScriptOverrides(resolved, script as Partial<Script>)
		: resolved;
}
