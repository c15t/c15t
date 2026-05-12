import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { buildQueuePixelInstall } from '../_shared/install-builders';
import { resolveScriptUrl } from '../_shared/script-url';

/**
 * Reddit Pixel standard conversion event names.
 *
 * @see {@link https://business.reddithelp.com/s/article/supported-conversion-events | Reddit supported conversion events}
 */
export type RedditPixelEventName =
	| 'PageVisit'
	| 'ViewContent'
	| 'Search'
	| 'AddToCart'
	| 'AddToWishlist'
	| 'Purchase'
	| 'Lead'
	| 'SignUp';

/**
 * Controls Reddit Pixel automatic advanced matching signals.
 *
 * @see {@link https://business.reddithelp.com/s/article/reddit-pixel | Reddit Pixel setup}
 */
export interface RedditPixelAdvancedMatchingOptions {
	/** Automatically scan page content for email addresses. */
	email?: boolean;

	/** Automatically scan page content for phone numbers. */
	phone_number?: boolean;
}

/**
 * Reddit Pixel initialization options.
 *
 * @see {@link https://business.reddithelp.com/s/article/reddit-pixel | Reddit Pixel setup}
 * @see {@link https://business.reddithelp.com/s/article/Limited-Data-Use | Reddit Limited Data Use}
 */
export interface RedditPixelInitOptions {
	/**
	 * Opt the user out of Reddit Pixel tracking.
	 *
	 * Reddit sends this as `opt_out=1` on pixel requests.
	 */
	optOut?: boolean;

	/**
	 * Disable Reddit first-party cookies during initialization.
	 */
	disableFirstPartyCookies?: boolean;

	/** Email address or SHA-256 email hash for attribution matching. */
	email?: string;

	/** Phone number or SHA-256 phone hash for attribution matching. */
	phoneNumber?: string;

	/** External user identifier or SHA-256 hash for attribution matching. */
	externalId?: string;

	/** Android Advertising ID or SHA-256 hash. */
	aaid?: string;

	/** iOS Identifier for Advertisers or SHA-256 hash. */
	idfa?: string;

	/** Automatic advanced matching controls. */
	aam?: RedditPixelAdvancedMatchingOptions;

	/**
	 * Data processing mode, including Reddit Limited Data Use values.
	 *
	 * @see {@link https://business.reddithelp.com/s/article/Limited-Data-Use | Reddit Limited Data Use}
	 */
	dpm?: string | string[];

	/**
	 * Data processing country code.
	 *
	 * @see {@link https://business.reddithelp.com/s/article/Limited-Data-Use | Reddit Limited Data Use}
	 */
	dpcc?: string;

	/**
	 * Data processing region code.
	 *
	 * @see {@link https://business.reddithelp.com/s/article/Limited-Data-Use | Reddit Limited Data Use}
	 */
	dprc?: string;

	/** Integration partner name. */
	partner?: string;

	/** Integration partner version. */
	partner_version?: string;

	/** Source integration name reported to Reddit. */
	integration?: 'reddit' | 'gtm' | (string & {});

	/** Enable Reddit Pixel debug logging. */
	debug?: boolean;

	/**
	 * Send monetary `value` metadata as `valueDecimal`.
	 *
	 * @default true
	 */
	useDecimalCurrencyValues?: boolean;

	[key: string]: unknown;
}

/**
 * Metadata supported by Reddit Pixel conversion events.
 *
 * @see {@link https://business.reddithelp.com/s/article/about-event-metadata | Reddit event metadata}
 * @see {@link https://business.reddithelp.com/s/article/manual-conversion-events-with-the-reddit-pixel | Reddit manual conversion events}
 */
export interface RedditPixelEventMetadata {
	itemCount?: number | string;
	value?: number | string;
	valueDecimal?: number | string;
	currency?: string;
	transactionId?: string;
	customEventName?: string;
	products?:
		| string
		| Array<{
				id?: string | number;
				name?: string;
				category?: string;
				quantity?: number | string;
				itemPrice?: number | string;
		  }>;
	/**
	 * Conversion ID used to deduplicate Pixel events against Conversions API
	 * events.
	 *
	 * @see {@link https://business.reddithelp.com/s/article/event-deduplication | Reddit event deduplication}
	 */
	conversionId?: string;
	[key: string]: unknown;
}

type RedditPixelFunction = {
	(command: 'init', pixelId: string, options?: RedditPixelInitOptions): void;
	(command: 'enableFirstPartyCookies'): void;
	(command: 'disableFirstPartyCookies'): void;
	(
		command: 'track',
		eventName: RedditPixelEventName | (string & {}),
		properties?: RedditPixelEventMetadata
	): void;
	(command: string, ...args: unknown[]): void;
};

declare global {
	interface Window {
		rdt?: RedditPixelFunction & {
			callQueue?: unknown[][];
			sendEvent?: (...args: unknown[]) => void;
		};
	}
}

/**
 * Reddit Pixel vendor manifest.
 *
 * Sets up Reddit's queue stub and optionally queues the standard page visit
 * event before the external bundle loads.
 */
export const redditPixelManifest = {
	...vendorManifestContract,
	vendor: 'reddit-pixel',
	category: 'marketing',
	persistAfterConsentRevoked: true,
	bootstrap: [
		{
			type: 'defineStubFunction',
			name: 'rdt',
			queue: {
				property: 'callQueue',
			},
			dispatchProperty: 'sendEvent',
			queueFormat: 'array',
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'callGlobal',
			global: 'rdt',
			args: ['init', '{{pixelId}}'],
		},
		{
			type: 'callGlobal',
			global: 'rdt',
			args: ['track', 'PageVisit'],
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
			global: 'rdt',
			args: ['enableFirstPartyCookies'],
		},
	],
	onConsentDenied: [
		{
			type: 'callGlobal',
			global: 'rdt',
			args: ['disableFirstPartyCookies'],
		},
	],
} as const satisfies VendorManifest;

export interface RedditPixelOptions {
	/**
	 * Your Reddit Pixel ID.
	 * @example `t2_abcdef`
	 */
	pixelId: string;

	/**
	 * Queue the standard `PageVisit` event during setup.
	 * @default true
	 */
	trackPageVisit?: boolean;

	/**
	 * Optional payload passed as the third argument to `rdt('init', ...)`.
	 */
	initOptions?: RedditPixelInitOptions;

	/**
	 * Disable Reddit first-party cookies during setup.
	 *
	 * This is merged into `initOptions.disableFirstPartyCookies`.
	 */
	disableFirstPartyCookies?: boolean;

	/** Reddit Pixel loader URL. */
	scriptUrl?: string;
}

/**
 * Creates a Reddit Pixel script.
 *
 * @param options - The options for the Reddit Pixel script.
 * @returns The Reddit Pixel script configuration.
 */
export function redditPixel({
	pixelId,
	trackPageVisit = true,
	initOptions,
	disableFirstPartyCookies,
	scriptUrl,
}: RedditPixelOptions): Script {
	let trackStep: { args: unknown[] } | undefined;

	if (trackPageVisit) {
		trackStep = {
			args: ['track', 'PageVisit'],
		};
	}

	const resolvedInitOptions = getRedditPixelInitOptions({
		initOptions,
		disableFirstPartyCookies,
	});
	const initArgs: unknown[] = ['init', '{{pixelId}}'];
	if (resolvedInitOptions !== undefined) {
		initArgs.push('{{initOptions}}');
	}

	const install = buildQueuePixelInstall({
		global: 'rdt',
		initArgs,
		trackStep,
	});

	const manifest = {
		...redditPixelManifest,
		install,
	} as const satisfies VendorManifest;

	return resolveManifest(manifest, {
		pixelId,
		initOptions: resolvedInitOptions,
		scriptUrl: resolveScriptUrl(
			scriptUrl,
			'https://www.redditstatic.com/ads/pixel.js'
		),
	});
}

/**
 * Merges optional init options with an explicit first-party cookie flag.
 *
 * @param initOptions - Optional Reddit Pixel init options.
 * @param disableFirstPartyCookies - Optional first-party cookie disable flag.
 * @returns Reddit Pixel init options, or `undefined` when no options are set.
 *
 * @internal
 */
function getRedditPixelInitOptions({
	initOptions,
	disableFirstPartyCookies,
}: {
	initOptions?: RedditPixelInitOptions;
	disableFirstPartyCookies?: boolean;
}): RedditPixelInitOptions | undefined {
	if (disableFirstPartyCookies === undefined) {
		return initOptions;
	}

	return {
		...initOptions,
		disableFirstPartyCookies,
	};
}

/**
 * Tracks a Reddit Pixel event.
 *
 * @param eventName - Reddit standard event name or a custom event name.
 * @param metadata - Optional event metadata, including `conversionId` for
 * Pixel plus Conversions API deduplication.
 */
export const redditPixelEvent = (
	eventName: RedditPixelEventName | (string & {}),
	metadata?: RedditPixelEventMetadata
) => {
	if (typeof window === 'undefined' || typeof window.rdt !== 'function') {
		return;
	}

	window.rdt('track', eventName, metadata);
};
