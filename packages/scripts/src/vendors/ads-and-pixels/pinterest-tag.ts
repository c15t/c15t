import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { resolveScriptUrl } from '../_shared/script-url';

/**
 * The 20 Pinterest Tag event types accepted by `pintrk('track', ...)`.
 *
 * Conversion tracking and reporting require one of these names. Any other
 * string is treated as a user-defined event, which Pinterest makes available
 * for audience targeting only.
 *
 * @see {@link https://help.pinterest.com/en/business/article/add-event-codes} Add event codes
 */
export type PinterestTagEventName =
	| 'pagevisit'
	| 'viewcategory'
	| 'search'
	| 'addtocart'
	| 'checkout'
	| 'watchvideo'
	| 'signup'
	| 'lead'
	| 'custom'
	| 'addpaymentinfo'
	| 'addtowishlist'
	| 'initiatecheckout'
	| 'subscribe'
	| 'viewcontent'
	| 'contact'
	| 'schedule'
	| 'findlocation'
	| 'customizeproduct'
	| 'submitapplication'
	| 'starttrial';

/**
 * A product entry in `PinterestTagEventData.line_items`.
 *
 * Pinterest reads product-level details from `line_items`, not from the
 * top level of the event data.
 */
export interface PinterestTagLineItem {
	/** Product name, for example `Parker Boots`. */
	product_name?: string;

	/** Product identifier or SKU. */
	product_id?: string;

	/** Product category, for example `Shoes`. */
	product_category?: string;

	/** Variant identifier, for example `1414-Red`. */
	product_variant_id?: string;

	/** Human-readable variant, for example `Red`. */
	product_variant?: string;

	/** Unit price of the product. */
	product_price?: number;

	/** Quantity of this product in the event. */
	product_quantity?: number;

	/** Brand name. */
	product_brand?: string;

	[key: string]: unknown;
}

/**
 * Currency codes Pinterest accepts in `PinterestTagEventData.currency`.
 *
 * Pinterest converts the reported value to your advertiser account currency.
 */
export type PinterestTagCurrency =
	| 'AED'
	| 'AMD'
	| 'ARS'
	| 'AUD'
	| 'AZN'
	| 'BAM'
	| 'BGN'
	| 'BHD'
	| 'BMD'
	| 'BND'
	| 'BOB'
	| 'BRL'
	| 'BSD'
	| 'CAD'
	| 'CHF'
	| 'CLP'
	| 'CNY'
	| 'COP'
	| 'CRC'
	| 'CZK'
	| 'DKK'
	| 'DOP'
	| 'EGP'
	| 'EUR'
	| 'FJD'
	| 'GBP'
	| 'GEL'
	| 'GIP'
	| 'HKD'
	| 'HNL'
	| 'HRK'
	| 'HUF'
	| 'IDR'
	| 'ILS'
	| 'INR'
	| 'ISK'
	| 'JMD'
	| 'JPY'
	| 'KGS'
	| 'KRW'
	| 'KWD'
	| 'KZT'
	| 'MAD'
	| 'MDL'
	| 'MOP'
	| 'MXN'
	| 'MYR'
	| 'NOK'
	| 'NZD'
	| 'OMR'
	| 'PAB'
	| 'PEN'
	| 'PHP'
	| 'PKR'
	| 'PLN'
	| 'QAR'
	| 'RON'
	| 'RSD'
	| 'RUB'
	| 'SAR'
	| 'SEK'
	| 'SGD'
	| 'THB'
	| 'TRY'
	| 'TWD'
	| 'UAH'
	| 'USD'
	| 'UYU'
	| 'VND'
	| 'ZAR';

/**
 * Event data accepted by `pintrk('track', ...)`.
 *
 * Pinterest documents the same field set for every event type; which fields
 * are meaningful depends on the event. All event data is available for
 * audience targeting, but only `value` and `order_quantity` appear in paid
 * and organic conversion reporting. Any additional keys are forwarded
 * unchanged.
 */
export interface PinterestTagEventData {
	/**
	 * Unique event identifier used to deduplicate against Conversions API
	 * events. Pinterest also accepts this under `eventID` or `eid`.
	 */
	event_id?: string;

	/** Case-sensitive alias for `event_id`. */
	eventID?: string;

	/** Case-sensitive alias for `event_id`. */
	eid?: string;

	/**
	 * Total monetary value for commerce events such as `checkout`.
	 *
	 * Available in conversion reporting.
	 */
	value?: number;

	/**
	 * Total number of items in the order.
	 *
	 * Available in conversion reporting.
	 */
	order_quantity?: number;

	/**
	 * Currency code for `value`, for example `USD`. Required for `addtocart`
	 * and `checkout` in catalog sales campaigns.
	 */
	currency?: PinterestTagCurrency | (string & {});

	/**
	 * Order identifier for `checkout` events. Required for conversion
	 * analysis reporting.
	 */
	order_id?: string;

	/** Promo code applied to the order. */
	promo_code?: string;

	/** Property or store name, for example `Athleta`. */
	property?: string;

	/** Query text for `search` events. */
	search_query?: string;

	/** Video title for `watchvideo` events. */
	video_title?: string;

	/** Lead type for `lead` events, for example `Newsletter`. */
	lead_type?: string;

	/** Products associated with the event. */
	line_items?: PinterestTagLineItem[];

	[key: string]: unknown;
}

/**
 * Options passed as the third argument to `pintrk('load', tagId, options)`.
 */
export interface PinterestTagLoadOptions {
	/**
	 * Email address (plain or SHA-256 hashed) for Pinterest enhanced match.
	 *
	 * Only provide this when your application has separately obtained the
	 * appropriate user consent to share it with Pinterest.
	 */
	em?: string;

	/**
	 * Hashed external user identifier used by Pinterest for attribution.
	 */
	external_id?: string;

	[key: string]: unknown;
}

/**
 * Optional callback passed as the last argument to `pintrk('track', ...)`.
 *
 * @param didInit - `true` when Pinterest constructed the event call
 *   successfully, `false` when it detected an error.
 * @param error - Error description when `didInit` is `false`, otherwise
 *   `undefined`.
 */
export type PinterestTagEventCallback = (
	didInit: boolean,
	error?: string
) => void;

type PinterestTagFunction = {
	(command: 'load', tagId: string, options?: PinterestTagLoadOptions): void;
	(command: 'page'): void;
	(
		command: 'track',
		eventName: PinterestTagEventName | (string & {}),
		eventData?: PinterestTagEventData,
		callback?: PinterestTagEventCallback
	): void;
	(command: 'setconsent', consent: boolean): void;
	(command: 'set', data: Record<string, unknown>): void;
	(command: string, ...args: unknown[]): void;
};

// Extended Window interface to include Pinterest Tag-specific properties
declare global {
	interface Window {
		pintrk?: PinterestTagFunction & {
			queue?: unknown[][];
			version?: string;
		};
	}
}

/**
 * Pinterest Tag vendor manifest.
 *
 * Mirrors Pinterest's v3 base code: a `pintrk` stub that pushes argument
 * arrays onto `pintrk.queue`, `pintrk.version = "3.0"`, then the async
 * `core.js` loader.
 *
 * Pinterest exposes a runtime consent API via `pintrk('setconsent', boolean)`.
 * `setconsent(false)` stops events and clears Pinterest's first-party
 * storage, so the script persists after consent revocation and receives the
 * updated consent state instead of being removed from the document.
 */
export const pinterestTagManifest = {
	...vendorManifestContract,
	vendor: 'pinterest-tag',
	category: 'marketing',
	persistAfterConsentRevoked: true,
	bootstrap: [
		{
			type: 'defineStubFunction',
			name: 'pintrk',
			queue: {
				property: 'queue',
			},
			queueFormat: 'array',
			properties: {
				version: '3.0',
			},
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'callGlobal',
			global: 'pintrk',
			args: ['load', '{{tagId}}'],
		},
		{
			type: 'callGlobal',
			global: 'pintrk',
			args: ['setconsent', true],
		},
		{
			type: 'callGlobal',
			global: 'pintrk',
			args: ['page'],
		},
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
		},
	],
	onConsentGranted: [
		{
			type: 'callGlobal',
			global: 'pintrk',
			args: ['setconsent', true],
		},
	],
	onConsentDenied: [
		{
			type: 'callGlobal',
			global: 'pintrk',
			args: ['setconsent', false],
		},
	],
} as const satisfies VendorManifest;

export interface PinterestTagOptions {
	/**
	 * Your Pinterest Tag ID.
	 * @example `2613654212508`
	 */
	tagId: string;

	/**
	 * Optional payload passed to `pintrk('load', tagId, loadOptions)`, for
	 * example enhanced match values.
	 *
	 * Do not provide user identifiers unless the appropriate consent and
	 * privacy requirements have already been satisfied.
	 */
	loadOptions?: PinterestTagLoadOptions;

	/**
	 * Queue the default `pintrk('page')` page-visit event during setup.
	 * @default true
	 */
	trackPageVisit?: boolean;

	/** Pinterest Tag loader URL. */
	scriptUrl?: string;
}

/**
 * Creates a Pinterest Tag script.
 *
 * This script persists after consent is revoked because Pinterest exposes
 * `pintrk('setconsent', boolean)`, which lets c15t disable tracking and clear
 * Pinterest's first-party storage without removing the script element.
 *
 * @param options.tagId - Pinterest Tag ID used in `pintrk('load', ...)`.
 *   Numeric string from Pinterest Ads Manager, for example `'2613654212508'`.
 * @param options.loadOptions - Optional object passed as the third argument to
 *   `pintrk('load', tagId, loadOptions)`, for example `{ em: 'user@example.com' }`.
 * @param options.trackPageVisit - Whether to queue the default `pintrk('page')`
 *   call during setup. Defaults to `true`.
 * @param options.scriptUrl - Override for Pinterest's `core.js` loader URL.
 * @returns A resolved c15t `Script` configuration that defines the `pintrk`
 *   queue stub, queues `load`, `setconsent`, and optionally `page`, then loads
 *   Pinterest's `core.js`.
 *
 * @example
 * ```ts
 * const script = pinterestTag({
 * 	tagId: '2613654212508',
 * 	loadOptions: { em: 'user@example.com' },
 * 	trackPageVisit: false,
 * });
 * ```
 *
 * @see {@link https://help.pinterest.com/en/business/article/install-the-pinterest-tag} Pinterest Tag documentation
 */
export function pinterestTag({
	tagId,
	loadOptions,
	trackPageVisit = true,
	scriptUrl,
}: PinterestTagOptions): Script {
	const loadArgs: unknown[] = ['load', '{{tagId}}'];
	if (loadOptions !== undefined) {
		loadArgs.push('{{loadOptions}}');
	}

	const install: VendorManifest['install'] = [
		{
			type: 'callGlobal',
			global: 'pintrk',
			args: loadArgs,
		},
		{
			type: 'callGlobal',
			global: 'pintrk',
			args: ['setconsent', true],
		},
	];

	if (trackPageVisit) {
		install.push({
			type: 'callGlobal',
			global: 'pintrk',
			args: ['page'],
		});
	}

	install.push({
		type: 'loadScript',
		src: '{{scriptUrl}}',
		async: true,
	});

	const manifest = {
		...pinterestTagManifest,
		install,
	} as const satisfies VendorManifest;

	return resolveManifest(manifest, {
		tagId,
		loadOptions,
		scriptUrl: resolveScriptUrl(scriptUrl, 'https://s.pinimg.com/ct/core.js'),
	});
}

/**
 * Tracks a Pinterest Tag event.
 *
 * This helper is a no-op until Pinterest has been initialized by c15t, so it
 * is safe to call before marketing consent is granted. It does not bypass
 * consent: after revocation Pinterest's own `setconsent(false)` state
 * suppresses the event.
 *
 * @param eventName - One of Pinterest's 20 event types or a user-defined
 *   event name.
 * @param eventData - Optional event data, including `event_id` for Tag plus
 *   Conversions API deduplication.
 * @param callback - Optional `(didInit, error)` callback Pinterest invokes
 *   after constructing the event call. Useful for surfacing tag errors in
 *   development.
 *
 * @example
 * ```ts
 * pinterestTagEvent('checkout', {
 * 	event_id: 'event-123',
 * 	value: 99.99,
 * 	order_quantity: 1,
 * 	currency: 'USD',
 * 	order_id: 'order-123',
 * 	line_items: [
 * 		{
 * 			product_name: 'Parker Boots',
 * 			product_id: '1414',
 * 			product_price: 99.99,
 * 			product_quantity: 1,
 * 		},
 * 	],
 * });
 * ```
 *
 * @example
 * ```ts
 * pinterestTagEvent('lead', { lead_type: 'Newsletter' }, (didInit, error) => {
 * 	if (!didInit) {
 * 		console.error(error);
 * 	}
 * });
 * ```
 */
export const pinterestTagEvent = (
	eventName: PinterestTagEventName | (string & {}),
	eventData?: PinterestTagEventData,
	callback?: PinterestTagEventCallback
): void => {
	if (typeof window === 'undefined' || typeof window.pintrk !== 'function') {
		return;
	}

	if (callback !== undefined) {
		window.pintrk('track', eventName, eventData ?? {}, callback);
		return;
	}

	if (eventData === undefined) {
		window.pintrk('track', eventName);
		return;
	}

	window.pintrk('track', eventName, eventData);
};
