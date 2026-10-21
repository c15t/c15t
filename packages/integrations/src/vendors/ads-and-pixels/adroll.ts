import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

type AdrollMethod = 'setProperties' | 'identify' | 'track';
type AdrollQueue = unknown[] &
	Partial<Record<AdrollMethod, (...args: unknown[]) => void>> & {
		f?: string[];
	};
declare global {
	interface Window {
		adroll?: AdrollQueue;
		adroll_adv_id?: string;
		adroll_pix_id?: string;
		adroll_version?: string;
		__adroll_loaded?: boolean;
	}
}

/** AdRoll v2 account-specific loader. */
export const adrollPixelManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
	persistAfterConsentRevoked: true,
	vendor: 'adroll',
	vendorDetails: {
		homepageUrl: 'https://www.adroll.com/',
		legalName: 'NextRoll, Inc.',
		name: 'AdRoll',
		privacyPolicyUrl: 'https://www.nextroll.com/privacy',
	},
} as const satisfies VendorManifest;

/** Public account IDs from the generated AdRoll v2 snippet. */
export interface AdrollPixelOptions {
	/** Account advertiser ID, also used in the loader path. */
	advertiserId: string;
	/** Pixel ID from the generated snippet. */
	pixelId: string;
	/** Consent condition required before loading. Defaults to marketing. */
	category?: Script['category'];
	/** Override URL for the account-specific v2 loader. */
	scriptUrl?: string;
}

/**
 * Loads AdRoll v2 only after the mapped consent and queues the initial page view.
 * @param options - Public advertiser and pixel IDs, plus an optional loader URL.
 * @returns A gated script, or a skipped script for missing IDs.
 * @remarks Keep reload on revocation enabled. AdRoll has no documented stop API.
 * @example adrollPixel({ advertiserId: 'ADVERTISER_ID', pixelId: 'PIXEL_ID' });
 * @see https://help.adroll.com/hc/en-us/articles/360040116252
 */
export const adrollPixel = function adrollPixel(
	options: AdrollPixelOptions
): Script {
	const category = options?.category ?? 'marketing';
	const advertiserId = readId(options?.advertiserId);
	if (advertiserId === undefined) {
		return skipMissingId('adrollPixel', 'advertiserId', {
			category,
			manifest: adrollPixelManifest,
		});
	}
	const pixelId = readId(options.pixelId);
	if (pixelId === undefined) {
		return skipMissingId('adrollPixel', 'pixelId', {
			category,
			manifest: adrollPixelManifest,
		});
	}
	const script = resolveManifest(adrollPixelManifest, {
		scriptUrl: resolveScriptUrl(
			trimToUndefined(options.scriptUrl),
			`https://s.adroll.com/j/${encodeURIComponent(advertiserId)}/roundtrip.js`
		),
	});
	return {
		...script,
		category,
		onBeforeLoad(info) {
			window.adroll_adv_id = advertiserId;
			window.adroll_pix_id = pixelId;
			window.adroll_version = '2.0';
			window.__adroll_loaded = true;
			const client = window.adroll ?? [];
			window.adroll = client;
			const methods: AdrollMethod[] = ['setProperties', 'identify', 'track'];
			client.f = methods;
			for (const method of methods) {
				client[method] ??= function queueAdrollCall() {
					// AdRoll replays the second tuple member with Function.apply.
					// oxlint-disable-next-line prefer-rest-params -- Match the official arguments queue.
					client.push([method, arguments]);
				};
			}
			client.track?.('pageView');
			script.onBeforeLoad?.(info);
		},
		serverStart: undefined,
	};
};
