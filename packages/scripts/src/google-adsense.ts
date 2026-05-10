import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

declare global {
	interface Window {
		adsbygoogle: Array<Record<string, unknown>> & {
			loaded?: boolean;
		};
	}
}

/**
 * Google AdSense vendor manifest.
 *
 * Seeds the `adsbygoogle` queue and loads the AdSense bundle. Optional Auto Ads
 * configuration is expressed as a queued object rather than framework-specific head
 * mutations.
 */
export const googleAdsenseManifest = {
	...vendorManifestContract,
	vendor: 'google-adsense',
	category: 'marketing',
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'adsbygoogle',
			value: [],
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'pushToQueue',
			queue: 'adsbygoogle',
			value: {
				google_ad_client: '{{client}}',
				enable_page_level_ads: true,
			},
		},
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
			attributes: {
				crossorigin: 'anonymous',
			},
		},
	],
} as const satisfies VendorManifest;

export interface GoogleAdsenseOptions {
	/**
	 * Your AdSense publisher client ID.
	 * @example `ca-pub-1234567890123456`
	 */
	client: string;

	/**
	 * Queue an Auto Ads configuration object.
	 * @default false
	 */
	autoAds?: boolean;

	/** AdSense loader URL. */
	scriptSrc?: string;
}

/**
 * Creates a Google AdSense script.
 *
 * @param options - The options for the Google AdSense script
 * @returns The Google AdSense script configuration
 *
 * @example
 * ```ts
 * const googleAdsenseScript = googleAdsense({
 *   client: 'ca-pub-1234567890123456',
 * });
 * ```
 *
 * @see {@link https://support.google.com/adsense/answer/9274015} Google AdSense documentation
 */
export function googleAdsense({
	client,
	autoAds = false,
	scriptSrc,
}: GoogleAdsenseOptions): Script {
	const manifest = autoAds
		? googleAdsenseManifest
		: ({
				...googleAdsenseManifest,
				install: googleAdsenseManifest.install.filter(
					(step) => step.type !== 'pushToQueue'
				),
			} as const satisfies VendorManifest);

	const resolved = resolveManifest(manifest, {
		client,
		scriptSrc:
			scriptSrc ??
			`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`,
	});

	return resolved;
}
