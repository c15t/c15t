import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { booleanDataAttribute, listDataAttribute } from '../_shared/attributes';
import { resolveScriptUrl } from '../_shared/script-url';

declare global {
	interface Window {
		umami?: {
			identify: (sessionData?: Record<string, unknown> | string) => void;
			track: {
				(payload?: Record<string, unknown>): void;
				(eventName: string, eventData?: Record<string, unknown>): void;
			};
		};
	}
}

/**
 * Umami Analytics vendor manifest.
 *
 * Configures Umami entirely through script `data-*` attributes. Umami is a
 * cookieless analytics product, so the script is consent-gated on
 * `measurement` and unloaded when consent is revoked.
 */
export const umamiAnalyticsManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			attributes: {
				'data-auto-track': '{{autoTrackAttribute}}',
				'data-before-send': '{{beforeSend}}',

				'data-domains': '{{domains}}',
				'data-host-url': '{{hostUrl}}',
				'data-tag': '{{tag}}',
				'data-website-id': '{{websiteId}}',
			},

			defer: true,
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'umami-analytics',
} as const satisfies VendorManifest;

export interface UmamiAnalyticsOptions {
	/**
	 * Your Umami website ID.
	 */
	websiteId: string;

	/**
	 * Override the host that receives analytics events.
	 */
	hostUrl?: string;

	/**
	 * Disable automatic tracking when set to `false`.
	 */
	autoTrack?: boolean;

	/**
	 * Restrict tracking to specific domains.
	 */
	domains?: string[] | string;

	/**
	 * Attach a tag to tracked events.
	 */
	tag?: string;

	/**
	 * Optional global hook name used for Umami's `data-before-send` attribute.
	 *
	 * Callback functions are intentionally not supported here because the c15t
	 * manifest runtime cannot serialize custom JavaScript functions.
	 */
	beforeSend?: string;

	/**
	 * Custom loader URL.
	 * @default 'https://cloud.umami.is/script.js'
	 */
	scriptUrl?: string;
}

/**
 * Creates an Umami Analytics script.
 *
 * @see https://umami.is/docs/tracker-config
 *
 * @param options - The options for the Umami Analytics script.
 * @returns The Umami Analytics script.
 * @throws {Error} When `websiteId` is missing, empty, or invalid. Provide a
 * valid non-empty `websiteId` string to prevent this error.
 *
 * @example
 * ```ts
 * import { umamiAnalytics } from '@c15t/scripts/umami-analytics';
 *
 * umamiAnalytics({
 *   websiteId: 'site-abc-123',
 *   domains: ['example.com', 'www.example.com'],
 * });
 * ```
 */
export const umamiAnalytics = function umamiAnalytics(
	options: UmamiAnalyticsOptions
): Script {
	const websiteId = options.websiteId.trim();
	if (websiteId.length === 0) {
		throw new Error(
			'umamiAnalytics: invalid websiteId - must be a non-empty string'
		);
	}

	const resolved = resolveManifest(umamiAnalyticsManifest, {
		autoTrackAttribute: booleanDataAttribute(options.autoTrack),
		beforeSend: options.beforeSend,
		domains: listDataAttribute(options.domains),
		hostUrl: options.hostUrl,
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://cloud.umami.is/script.js'
		),
		tag: options.tag,
		websiteId,
	});

	return resolved;
};
