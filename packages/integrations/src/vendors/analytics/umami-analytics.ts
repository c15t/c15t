import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { booleanDataAttribute, listDataAttribute } from '../_shared/attributes';
import { readId, skipMissingId } from '../_shared/required-id';
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
	vendorDetails: {
		homepageUrl: 'https://umami.is/',
		legalName: 'Umami Software, Inc.',
		name: 'Umami',
		privacyPolicyUrl: 'https://umami.is/privacy',
	},
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
	 * Restrict tracking to specific domains. An array is joined into the
	 * comma-separated `data-domains` list Umami reads.
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
 * @remarks When `websiteId` is missing or blank, the helper logs
 *   `umamiAnalytics: missing or invalid websiteId` with `console.error` and
 *   returns a script that never loads.
 *
 * @example
 * ```ts
 * import { umamiAnalytics } from '@c15t/integrations/umami-analytics';
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
	const websiteId = readId(options.websiteId);
	if (websiteId === undefined) {
		return skipMissingId('umamiAnalytics', 'websiteId', {
			category: 'measurement',
			manifest: umamiAnalyticsManifest,
		});
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
