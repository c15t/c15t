import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

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
 * Uses structured bootstrap steps and provides a consent API
 * via `ttq.grantConsent()` / `ttq.revokeConsent()`.
 */
export const tiktokPixelManifest = {
	...vendorManifestContract,
	vendor: 'tiktok-pixel',
	category: 'marketing',
	persistAfterConsentRevoked: true,
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'TiktokAnalyticsObject',
			value: 'ttq',
		},
		{
			type: 'setGlobal',
			name: 'ttq',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'defineQueueMethods',
			target: 'ttq',
			methods: [
				'page',
				'track',
				'identify',
				'instances',
				'debug',
				'on',
				'off',
				'once',
				'ready',
				'alias',
				'group',
				'enableCookie',
				'disableCookie',
				'holdConsent',
				'revokeConsent',
				'grantConsent',
			],
		},
	],
	install: [
		{
			type: 'callGlobal',
			global: 'ttq',
			method: 'grantConsent',
		},
		{
			type: 'callGlobal',
			global: 'ttq',
			method: 'page',
		},
		{
			type: 'loadScript',
			src: '{{scriptSrc}}?sdkid={{pixelId}}&lib=ttq',
			async: true,
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

	/** TikTok Pixel loader base URL. */
	scriptSrc?: string;
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
export function tiktokPixel({
	pixelId,
	scriptSrc,
}: TikTokPixelOptions): Script {
	const resolved = resolveManifest(tiktokPixelManifest, {
		pixelId,
		scriptSrc: scriptSrc ?? 'https://analytics.tiktok.com/i18n/pixel/events.js',
	});

	return resolved;
}
