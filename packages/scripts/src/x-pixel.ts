import type { Script } from 'c15t';

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
interface XPixelEvent {
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

export interface XPixelOptions {
	/**
	 * Your X Pixel ID
	 * @example `123456789012345`
	 */
	pixelId: string;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'x-pixel'
	 * - `src`: `https://static.ads-twitter.com/uwt.js`
	 * - `category`: 'marketing'
	 */
	script?: Partial<Script>;
}

/**
 * Creates a Tiktok Pixel script.
 * This script is persistent after consent is revoked because it has built-in functionality to opt into and out of tracking based on consent, which allows us to not need to load the script again when consent is revoked.
 *
 * @param options - The options for the TikTok Pixel script
 * @returns The TikTok Pixel script configuration
 *
 * @example
 * ```ts
 * const tiktokPixelScript = tiktokPixel({
 *   pixelId: '123456789012345',
 * });
 * ```
 *
 * @see {@link https://ads.twitter.com/help/article/x-pixel} X Pixel documentation
 */
export function xPixel({ pixelId, script }: XPixelOptions): Script {
	return {
		id: script?.id ?? 'x-pixel',
		category: script?.category ?? 'marketing',
		textContent: `
!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='${script?.src ?? 'https://static.ads-twitter.com/uwt.js'}',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','${pixelId}');
		`.trim(),
		onDelete: (rest) => {
			delete window.twq;

			if (script?.onDelete) {
				script.onDelete(rest);
			}
		},
	};
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
