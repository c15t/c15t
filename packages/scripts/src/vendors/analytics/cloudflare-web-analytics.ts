import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
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
	vendor: 'cloudflare-web-analytics',
	category: 'measurement',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			defer: true,
			attributes: {
				'data-cf-beacon': '{{beaconConfig}}',
			},
		},
	],
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
export function cloudflareWebAnalytics(
	options: CloudflareWebAnalyticsOptions
): Script {
	const token = String(options.token).trim();
	if (token.length === 0) {
		throw new Error('cloudflareWebAnalytics: missing token');
	}

	const resolved = resolveManifest(cloudflareWebAnalyticsManifest, {
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://static.cloudflareinsights.com/beacon.min.js'
		),
		beaconConfig: JSON.stringify({
			token,
			spa: options.spa ?? true,
		}),
	});

	return resolved;
}
