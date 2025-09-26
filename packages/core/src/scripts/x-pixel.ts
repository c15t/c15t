import type { Script } from '../libs/script-loader/index';

// Extended Window interface to include TikTok Pixel-specific properties
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
		id: script?.id ?? 'tiktok-pixel',
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
 * @example { value: 10.00, currency: 'USD' }
 */
export const xPixelEvent = (
	eventId: string,
	metadata?: Record<string, unknown>
) => window.twq?.('event', eventId, metadata);
