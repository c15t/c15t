import type { Script } from 'c15t';
import { applyScriptOverrides, resolveManifest } from './resolve';
import type { VendorManifest } from './types';

// Extended Window interface to include TikTok Pixel-specific properties
declare global {
	interface Window {
		ttq: {
			grantConsent: () => void;
			revokeConsent: () => void;
			page: () => void;
		};
	}
}

/**
 * TikTok Pixel vendor manifest.
 *
 * Uses an inline bootstrap script and provides a consent API
 * via `ttq.grantConsent()` / `ttq.revokeConsent()`.
 */
export const tiktokPixelManifest = {
	vendor: 'tiktok-pixel',
	category: 'marketing',
	persistAfterConsentRevoked: true,
	install: [
		{
			type: 'inlineScript',
			code: `
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="{{scriptSrc}}",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('{{pixelId}}');
  ttq.grantConsent();
  ttq.page();
}(window, document, 'ttq');
			`.trim(),
		},
	],
	afterLoad: [
		{
			type: 'callGlobal',
			global: 'ttq',
			method: 'grantConsent',
		},
	],
	onConsentGranted: [
		{
			type: 'callGlobal',
			global: 'ttq',
			method: 'grantConsent',
		},
	],
	onConsentDenied: [
		{
			type: 'callGlobal',
			global: 'ttq',
			method: 'revokeConsent',
		},
	],
} as const satisfies VendorManifest;

export interface TikTokPixelOptions {
	/**
	 * Your TikTok Pixel ID
	 * @example `123456789012345`
	 */
	pixelId: string;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'tiktok-pixel'
	 * - `src`: `https://analytics.tiktok.com/i18n/pixel/events.js`
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
 * @see {@link https://ads.tiktok.com/help/article/tiktok-pixel} TikTok Pixel documentation
 */
export function tiktokPixel({ pixelId, script }: TikTokPixelOptions): Script {
	const resolved = resolveManifest(tiktokPixelManifest, {
		pixelId,
		scriptSrc:
			script?.src ?? 'https://analytics.tiktok.com/i18n/pixel/events.js',
	});

	return script ? applyScriptOverrides(resolved, script) : resolved;
}
