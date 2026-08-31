import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
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
 * @throws {Error} Throws `cloudflareWebAnalytics: missing token` when
 * `options.token` is missing, invalid, or trims to an empty string.
 *
 * @example
 * ```ts
 * import { cloudflareWebAnalytics } from '@c15t/scripts/cloudflare-web-analytics';
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
	let token: string;
	if (typeof options.token === 'string') {
		token = options.token.trim();
	} else {
		token = '';
	}
	if (token.length === 0) {
		throw new Error('cloudflareWebAnalytics: missing token');
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
