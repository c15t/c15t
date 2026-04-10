import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

export interface XPixelContent {
	/**
	 * Type of the content
	 * @example "Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Beds"
	 * @see https://www.google.com/basepages/producttype/taxonomy.en-US.txt
	 */
	content_type?: string;
	/**
	 * ID of the content
	 * For product catalog users: please pass SKU
	 * For all other users: Please pass Global Trade Item Number (GTIN) if available, otherwise pass SKU
	 * @example "1234567890"
	 */
	content_id: string;
	/**
	 * Name of a product or service
	 * @example "Cat Bed"
	 */
	content_name?: string;

	/**
	 * Price of a product or service
	 * @example 10.00
	 */
	content_price?: number;
	/**
	 * Quantity of the content
	 * @example 1
	 */
	num_items?: number;
	/**
	 * ID associated with a group of product variants
	 * @example "1234567890"
	 */
	content_group_id?: string;
}
export interface XPixelEvent {
	/**
	 * Total value of the conversion event (ex: $ value of the transaction in case of a purchase, etc.)
	 * @example 10.00
	 */
	value?: number;
	/**
	 * Currency of the conversion event
	 * ISO 4217 code (ex: USD, EUR, JPY, etc.)
	 * @example USD
	 */
	currency?: string;
	/**
	 * Unique identifier for the event that can be used for deduplication purposes
	 * @example tw-xxxx-xxxx
	 */
	conversion_id?: string;
	/**
	 * Search string of the conversion event
	 * @example "search query"
	 */
	search_string?: string;
	/**
	 * Description of the conversion event
	 * @example "purchase"
	 */
	description?: string;
	/**
	 * twclid of the conversion event
	 * The X Pixel already automatically passes twclid from URL or first-party cookie. This parameter can be optionally used to force attribution to a certain ad click.
	 * @example "twclid"
	 */
	twclid?: string;
	/**
	 * Status of the conversion event
	 * @example completed
	 */
	status?: boolean;

	/**
	 * Content/products associated with the conversion event
	 * @example [{content_id: 'OT001', content_name: 'bird seed', content_price: 50, num_items: 1}]
	 * @see {@link XPixelContent}
	 */
	contents?: XPixelContent[];
}

// Extended Window interface to include X Pixel-specific properties
declare global {
	interface Window {
		twq?: (event: string, ...args: unknown[]) => void;
	}
}

/**
 * X (Twitter) Pixel vendor manifest.
 *
 * Uses structured startup steps to load the X tracking pixel.
 * No consent API — the script simply loads or doesn't based on consent.
 */
export const xPixelManifest = {
	...vendorManifestContract,
	vendor: 'x-pixel',
	category: 'marketing',
	bootstrap: [
		{
			type: 'defineStubFunction',
			name: 'twq',
			queue: {
				property: 'queue',
			},
			dispatchProperty: 'exe',
			properties: {
				version: '1.1',
			},
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'callGlobal',
			global: 'twq',
			args: ['config', '{{pixelId}}'],
		},
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface XPixelOptions {
	/**
	 * Your X Pixel ID
	 * @example `123456789012345`
	 */
	pixelId: string;

	/** X Pixel loader URL. */
	scriptSrc?: string;
}

/**
 * Creates an X Pixel script.
 * This script is persistent after consent is revoked because it has built-in functionality to opt into and out of tracking based on consent, which allows us to not need to load the script again when consent is revoked.
 *
 * @param options - The options for the X Pixel script
 * @returns The X Pixel script configuration
 *
 * @example
 * ```ts
 * const xPixelScript = xPixel({
 *   pixelId: '123456789012345',
 * });
 * ```
 *
 * @see {@link https://ads.twitter.com/help/article/x-pixel} X Pixel documentation
 */
export function xPixel({ pixelId, scriptSrc }: XPixelOptions): Script {
	const resolved = resolveManifest(xPixelManifest, {
		pixelId,
		scriptSrc: scriptSrc ?? 'https://static.ads-twitter.com/uwt.js',
	});

	return resolved;
}

/**
 * @param eventId - The event ID to track
 * @example 'tw-xxxx-xxxx'
 * @param metadata - Optional metadata to track
 *
 * @usage
 * ```ts
 * xPixelEvent('tw-xxxx-xxxx', {
 *   value: 200.00,
 *   currency: 'USD',
 *   contents: [
 *     {content_id: 'OT001', content_name: 'bird seed', content_price: 50, num_items: 1},
 *     {content_id: 'OT002', content_name: 'bird cage', content_price: 150, num_items: 1}
 *   ]
 * });
 * ```
 *
 * @see {@link https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites#event-types-and-parameters}
 */
export const xPixelEvent = (eventId: string, metadata?: XPixelEvent) =>
	window.twq?.('event', eventId, metadata);
