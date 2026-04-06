import type { Script } from 'c15t';

/**
 * Event parameters for Reddit Pixel standard events.
 */
export interface RedditPixelEventParams {
	/**
	 * Total value of the conversion event
	 * @example 29.99
	 */
	value?: number;
	/**
	 * Currency of the conversion event (ISO 4217)
	 * @example 'USD'
	 */
	currency?: string;
	/**
	 * Number of items involved in the conversion
	 * @example 2
	 */
	itemCount?: number;
	/**
	 * Unique identifier for the transaction
	 * @example 'txn_123456'
	 */
	transactionId?: string;
}

/**
 * Parameters for Reddit Pixel custom events.
 */
export interface RedditPixelCustomEventParams extends RedditPixelEventParams {
	/**
	 * Name of the custom event
	 * @example 'SubscriptionUpgrade'
	 */
	customEventName: string;
}

/**
 * Standard event names supported by Reddit Pixel.
 * Event names are case-sensitive.
 */
export type RedditPixelStandardEvent =
	| 'PageVisit'
	| 'ViewContent'
	| 'Search'
	| 'AddToCart'
	| 'AddToWishlist'
	| 'Purchase'
	| 'Lead'
	| 'SignUp';

// Extended Window interface to include Reddit Pixel specific properties
declare global {
	interface Window {
		rdt?: {
			(
				command: 'init',
				pixelId: string,
				options?: Record<string, unknown>
			): void;
			(
				command: 'track',
				eventName: RedditPixelStandardEvent,
				params?: RedditPixelEventParams
			): void;
			(
				command: 'track',
				eventName: 'Custom',
				params: RedditPixelCustomEventParams
			): void;
			(command: 'disableFirstPartyCookies'): void;
			(...args: unknown[]): void;
			sendEvent?: (...args: unknown[]) => void;
			callQueue?: unknown[];
		};
	}
}

export interface RedditPixelOptions {
	/**
	 * Your Reddit Pixel ID
	 * @example `t2_abc123def`
	 */
	pixelId: string;

	/**
	 * Whether to use decimal currency values (e.g., 9.99 instead of 999 cents)
	 * @default true
	 */
	useDecimalCurrencyValues?: boolean;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'reddit-pixel'
	 * - `src`: `https://www.redditstatic.com/ads/pixel.js`
	 * - `category`: 'marketing'
	 */
	script?: Partial<Script>;
}

/**
 * Creates a Reddit Pixel script.
 *
 * The Reddit Pixel does not have a built-in consent grant/revoke API,
 * so the script is removed from the DOM when consent is revoked and
 * re-injected when consent is granted again.
 *
 * @param options - The options for the Reddit Pixel script
 * @returns The Reddit Pixel script configuration
 *
 * @example
 * ```ts
 * const redditPixelScript = redditPixel({
 *   pixelId: 't2_abc123def',
 * });
 * ```
 *
 * @see {@link https://business.reddithelp.com/s/article/manual-conversion-events-with-the-reddit-pixel} Reddit Pixel documentation
 */
export function redditPixel({
	pixelId,
	useDecimalCurrencyValues = true,
	script,
}: RedditPixelOptions): Script {
	return {
		id: script?.id ?? 'reddit-pixel',
		category: script?.category ?? 'marketing',
		textContent: `
!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="${script?.src ?? 'https://www.redditstatic.com/ads/pixel.js'}";t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
rdt('init','${pixelId}',${JSON.stringify({ optOut: false, useDecimalCurrencyValues })});
rdt('track','PageVisit');
		`.trim(),
		onDelete: (rest) => {
			delete window.rdt;

			if (script?.onDelete) {
				script.onDelete(rest);
			}
		},
	};
}

/**
 * Track a Reddit Pixel standard event.
 *
 * @param eventName - The standard event name to track
 * @param params - Optional event parameters
 *
 * @example
 * ```ts
 * redditPixelEvent('Purchase', { value: 29.99, currency: 'USD', itemCount: 2 });
 * ```
 *
 * @see {@link https://business.reddithelp.com/s/article/manual-conversion-events-with-the-reddit-pixel} Reddit Pixel events
 */
export const redditPixelEvent = (
	eventName: RedditPixelStandardEvent,
	params?: RedditPixelEventParams
) => window.rdt?.('track', eventName, params);

/**
 * Track a Reddit Pixel custom event.
 *
 * @param customEventName - The custom event name
 * @param params - Optional event parameters
 *
 * @example
 * ```ts
 * redditPixelCustomEvent('SubscriptionUpgrade', { value: 9.99, currency: 'USD' });
 * ```
 */
export const redditPixelCustomEvent = (
	customEventName: string,
	params?: RedditPixelEventParams
) =>
	window.rdt?.('track', 'Custom', {
		...params,
		customEventName,
	});
