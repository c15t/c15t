import type { Script } from 'c15t';

// Extended Window interface to include meta pixel specific properties
declare global {
	interface Window {
		fbq: {
			(command: 'init', pixelId: string): void;
			(
				command: 'track',
				eventName: string,
				params?: Record<string, unknown>
			): void;
			(command: 'consent', action: 'grant' | 'revoke'): void;
			(...args: unknown[]): void;
		};
		_fbq: Window['fbq'];
	}
}

export interface MetaPixelOptions {
	/**
	 * Your Meta Pixel ID
	 * @example `123456789012345`
	 */
	pixelId: string;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'meta-pixel'
	 * - `src`: `https://connect.facebook.net/en_US/fbevents.js`
	 * - `category`: 'marketing'
	 */
	script?: Partial<Script>;
}

/**
 * Creates a Meta Pixel script with inline JavaScript code.
 *
 * This script uses textContent to inject the Meta Pixel tracking code directly
 * into the page, which is the recommended approach for Meta Pixel implementation.
 *
 * @param options - The options for the Meta Pixel script
 * @returns The Meta Pixel script configuration
 *
 * @example
 * ```ts
 * const metaPixelScript = metaPixel({
 *   pixelId: '123456789012345',
 * });
 * ```
 *
 * @see {@link https://developers.facebook.com/docs/meta-pixel/get-started} Meta Pixel documentation
 */
export function metaPixel({ pixelId, script }: MetaPixelOptions): Script {
	return {
		id: script?.id ?? 'meta-pixel',
		category: script?.category ?? 'marketing',
		textContent: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'${script?.src ?? 'https://connect.facebook.net/en_US/fbevents.js'}');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
		`.trim(),
		// This is a persistent script because it has an API to manage the consent state
		persistAfterConsentRevoked: true,
		onLoad: (payload) => {
			window.fbq('consent', 'grant');

			if (script?.onLoad) {
				script.onLoad(payload);
			}
		},
		// This will run before the script is deleted
		onDelete: (payload) => {
			window.fbq('consent', 'revoke');

			if (script?.onDelete) {
				script.onDelete(payload);
			}
		},
	};
}
