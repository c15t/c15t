import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { booleanDataAttribute } from '../_shared/attributes';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl } from '../_shared/script-url';

declare global {
	interface Window {
		fathom?: {
			blockTrackingForMe: () => void;
			enableTrackingForMe: () => void;
			trackEvent: (
				eventName: string,
				opts?: {
					_value?: number;
				}
			) => void;
			trackGoal: (goalId: string, cents: number) => void;
			trackPageview: (opts?: { url: string; referrer?: string }) => void;
		};
	}
}

/**
 * Fathom Analytics vendor manifest.
 *
 * Configures Fathom via script `data-*` attributes. Fathom is a cookieless
 * analytics product, so the script is consent-gated on `measurement` and
 * unloaded when consent is revoked.
 */
export const fathomAnalyticsManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			attributes: {
				'data-auto': '{{autoAttribute}}',
				'data-canonical': '{{canonicalAttribute}}',
				'data-honor-dnt': '{{honorDntAttribute}}',

				'data-site': '{{site}}',
				'data-spa': '{{spa}}',
			},

			defer: true,
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'fathom-analytics',
	vendorDetails: {
		homepageUrl: 'https://usefathom.com/',
		legalName: 'Conva Ventures Inc.',
		name: 'Fathom Analytics',
		privacyPolicyUrl: 'https://usefathom.com/legal/privacy',
	},
} as const satisfies VendorManifest;

export interface FathomAnalyticsOptions {
	/**
	 * Your Fathom Analytics site ID.
	 */
	site: string;

	/**
	 * The SPA tracking mode. When undefined, SPA auto-routing is disabled and
	 * the `data-spa` attribute is omitted.
	 */
	spa?: 'auto' | 'history' | 'hash';

	/**
	 * Automatically track page views.
	 */
	auto?: boolean;

	/**
	 * Enable canonical URL tracking.
	 */
	canonical?: boolean;

	/**
	 * Honor Do Not Track requests.
	 */
	honorDnt?: boolean;

	/**
	 * Custom loader URL.
	 * @default 'https://cdn.usefathom.com/script.js'
	 */
	scriptUrl?: string;
}

/**
 * Creates a Fathom Analytics script.
 *
 * @see https://usefathom.com/docs/script/script-settings
 *
 * @param options - The options for the Fathom Analytics script.
 * @returns The Fathom Analytics script.
 * @remarks When `site` is missing or blank, the
 *   helper logs `fathomAnalytics: missing or invalid site` with
 *   `console.error` and returns a script that never loads.
 *
 * @example
 * ```ts
 * import { fathomAnalytics } from '@c15t/integrations/fathom-analytics';
 *
 * fathomAnalytics({
 *   site: 'SITE123',
 *   spa: 'history',
 *   canonical: true,
 * });
 * ```
 */
export const fathomAnalytics = function fathomAnalytics(
	options: FathomAnalyticsOptions
): Script {
	const site = readId(options.site);
	if (site === undefined) {
		return skipMissingId('fathomAnalytics', 'site', {
			category: 'measurement',
			id: 'fathom-analytics',
		});
	}

	const resolved = resolveManifest(fathomAnalyticsManifest, {
		autoAttribute: booleanDataAttribute(options.auto),
		canonicalAttribute: booleanDataAttribute(options.canonical),
		honorDntAttribute: booleanDataAttribute(options.honorDnt),
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://cdn.usefathom.com/script.js'
		),
		site,
		spa: options.spa,
	});

	return resolved;
};
