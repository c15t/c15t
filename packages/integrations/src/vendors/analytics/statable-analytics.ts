import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

declare global {
	interface Window {
		statable?: {
			t: (eventName: string, props?: Record<string, unknown>) => void;
		};
	}
}

/** Statable's attribute-based loader, gated on measurement consent. */
export const statableAnalyticsManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			attributes: {
				'data-id': '{{siteId}}',
				'data-tracking-api': '{{trackingApi}}',
			},
			defer: true,
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'statable-analytics',
	vendorDetails: {
		homepageUrl: 'https://statable.com/',
		legalName: 'Key Arg B.V.',
		name: 'Statable',
		privacyPolicyUrl: 'https://statable.com/privacy',
	},
} as const satisfies VendorManifest;

export interface StatableAnalyticsOptions {
	/** Positive integer site ID from the Statable dashboard. */
	siteId: string | number;
	/**
	 * Custom loader URL. The `{siteId}` placeholder is replaced with the site ID.
	 * @default 'https://statable.com/js/{siteId}/s.js'
	 */
	scriptUrl?: string;
	/**
	 * Complete ingestion endpoint, forwarded as `data-tracking-api`.
	 * By default Statable posts to `/api/event` on the loader's origin.
	 */
	trackingApi?: string;
}

/**
 * Creates a Statable loader that waits for measurement consent.
 *
 * Statable initializes its own `window.statable` event API. This helper leaves
 * that global absent before the tracker loads; early events are not queued.
 * Keep c15t's default reload on revocation to stop the running tracker.
 *
 * @param options - Statable site ID and optional loader and ingestion URLs.
 * @returns The consent-gated script, or a disabled script for an invalid ID.
 * @remarks A missing, blank or invalid site ID logs
 * `statableAnalytics: missing or invalid siteId` and never loads the tracker.
 * @example
 * statableAnalytics({ siteId: '12345' });
 * @see https://statable.com/docs/
 */
export const statableAnalytics = function statableAnalytics(
	options: StatableAnalyticsOptions
): Script {
	const siteId = readId(options?.siteId);
	if (
		siteId === undefined ||
		!/^[1-9]\d*$/u.test(siteId) ||
		!Number.isSafeInteger(Number(siteId))
	) {
		return skipMissingId('statableAnalytics', 'siteId', {
			category: 'measurement',
			manifest: statableAnalyticsManifest,
		});
	}

	const scriptUrl = resolveScriptUrl(
		options.scriptUrl,
		'https://statable.com/js/{siteId}/s.js'
	).replaceAll('{siteId}', siteId);

	return resolveManifest(statableAnalyticsManifest, {
		scriptUrl,
		siteId,
		trackingApi: trimToUndefined(options.trackingApi),
	});
};
