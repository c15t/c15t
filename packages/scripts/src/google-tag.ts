import type { AllConsentNames, Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

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
	...vendorManifestContract,
	vendor: 'gtag',
	category: '{{category}}',
	alwaysLoad: true,
	persistAfterConsentRevoked: true,
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'dataLayer',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'defineQueueFunction',
			name: 'gtag',
			queue: 'dataLayer',
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'callGlobal',
			global: 'gtag',
			args: ['js', '{{loadTime}}'],
		},
		{
			type: 'callGlobal',
			global: 'gtag',
			args: ['config', '{{id}}'],
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
	 * Custom mapping from c15t consent categories to Google Consent Mode v2 types.
	 * Overrides the default mapping when provided.
	 *
	 * @default
	 * ```ts
	 * {
	 *   necessary: ['security_storage'],
	 *   functionality: ['functionality_storage'],
	 *   measurement: ['analytics_storage'],
	 *   marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
	 *   experience: ['personalization_storage'],
	 * }
	 * ```
	 */
	consentMapping?: Record<string, string[]>;

	/**
	 * Deprecated script-level overrides preserved for backwards compatibility.
	 *
	 * Prefer manifest-backed options instead of this generic override bag.
	 * @deprecated
	 */
	script?: Partial<Script>;
}

/**
 * Creates a Google Tag (gtag.js) script.
 * Allows you to send data website to linked Google products like Analytics, Ads & Floodlight.
 *
 * @param options - The options for the gtag script.
 * @returns The Google Tag Manager script.
 */
export function gtag({
	id,
	category,
	consentMapping,
	script,
}: GtagOptions): Script {
	const manifest = consentMapping
		? { ...gtagManifest, consentMapping }
		: gtagManifest;

	const resolved = resolveManifest(manifest, {
		id,
		category,
		loadTime: new Date(),
	});

	if (!script) {
		return resolved;
	}

	return {
		...resolved,
		...script,
		attributes: {
			...(resolved.attributes ?? {}),
			...(script.attributes ?? {}),
		},
	};
}
