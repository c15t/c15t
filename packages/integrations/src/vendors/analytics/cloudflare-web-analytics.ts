import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl } from '../_shared/script-url';

declare global {
	interface Window {
		__cfBeacon?: {
			spa?: boolean;
			token: string;
		};
	}
}

/**
 * Cloudflare Web Analytics vendor manifest.
 *
 * Serializes Cloudflare's beacon config into the `data-cf-beacon` attribute.
 * Cloudflare Web Analytics is cookieless, so the script is consent-gated on
 * `measurement` and unloaded when consent is revoked.
 */
export const cloudflareWebAnalyticsManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			attributes: {
				'data-cf-beacon': '{{beaconConfig}}',
			},

			defer: true,
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'cloudflare-web-analytics',
	vendorDetails: {
		homepageUrl: 'https://www.cloudflare.com/web-analytics/',
		legalName: 'Cloudflare, Inc.',
		name: 'Cloudflare Web Analytics',
		privacyPolicyUrl: 'https://www.cloudflare.com/privacypolicy/',
	},
} as const satisfies VendorManifest;

export interface CloudflareWebAnalyticsOptions {
	/**
	 * Your Cloudflare Web Analytics token.
	 */
	token: string;

	/**
	 * Enable Cloudflare's SPA route tracking.
	 * @default true
	 */
	spa?: boolean;

	/**
	 * Custom loader URL.
	 * @default 'https://static.cloudflareinsights.com/beacon.min.js'
	 */
	scriptUrl?: string;
}

/**
 * Creates a Cloudflare Web Analytics script.
 *
 * @see https://developers.cloudflare.com/analytics/web-analytics/get-started/
 *
 * @param options - The options for the Cloudflare Web Analytics script.
 * @returns The Cloudflare Web Analytics script.
 * @remarks When `token` is missing or blank, the
 *   helper logs `cloudflareWebAnalytics: missing or invalid token` with
 *   `console.error` and returns a script that never loads.
 *
 * @example
 * ```ts
 * import { cloudflareWebAnalytics } from '@c15t/integrations/cloudflare-web-analytics';
 *
 * cloudflareWebAnalytics({
 *   token: 'abc123...',
 *   spa: true,
 * });
 * ```
 */
export const cloudflareWebAnalytics = function cloudflareWebAnalytics(
	options: CloudflareWebAnalyticsOptions
): Script {
	const token = readId(options.token);
	if (token === undefined) {
		return skipMissingId('cloudflareWebAnalytics', 'token', {
			category: 'measurement',
			id: 'cloudflare-web-analytics',
		});
	}

	const resolved = resolveManifest(cloudflareWebAnalyticsManifest, {
		beaconConfig: JSON.stringify({
			spa: options.spa ?? true,

			token,
		}),
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://static.cloudflareinsights.com/beacon.min.js'
		),
	});

	return resolved;
};
