import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';

interface TikTokPixelFunction {
	grantConsent: () => void;
	revokeConsent: () => void;
	page: () => void;
	track: (eventName: string, properties?: Record<string, unknown>) => void;
	identify: (properties?: Record<string, unknown>) => void;
	instances: (...args: unknown[]) => void;
	debug: (...args: unknown[]) => void;
	on: (...args: unknown[]) => void;
	off: (...args: unknown[]) => void;
	once: (...args: unknown[]) => void;
	ready: (...args: unknown[]) => void;
	alias: (...args: unknown[]) => void;
	group: (...args: unknown[]) => void;
	enableCookie: (...args: unknown[]) => void;
	disableCookie: (...args: unknown[]) => void;
	holdConsent: (...args: unknown[]) => void;
}

// Extended Window interface to include TikTok Pixel-specific properties
declare global {
	interface Window {
		ttq: TikTokPixelFunction;
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
	afterLoad: [
		{
			global: 'ttq',
			method: 'grantConsent',

			type: 'callGlobal',
		},
	],
	bootstrap: [
		{
			name: 'TiktokAnalyticsObject',
			type: 'setGlobal',
			value: 'ttq',
		},
		{
			ifUndefined: true,

			name: 'ttq',
			type: 'setGlobal',
			value: [],
		},
		{
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

			target: 'ttq',
			type: 'defineQueueMethods',
		},
	],
	category: 'marketing',
	install: [
		{
			global: 'ttq',
			method: 'grantConsent',

			type: 'callGlobal',
		},
		{
			global: 'ttq',
			method: 'page',

			type: 'callGlobal',
		},
		{
			async: true,

			src: '{{scriptSrc}}?sdkid={{pixelId}}&lib=ttq',
			type: 'loadScript',
		},
	],
	onConsentDenied: [
		{
			global: 'ttq',
			method: 'revokeConsent',

			type: 'callGlobal',
		},
	],
	onConsentGranted: [
		{
			global: 'ttq',
			method: 'grantConsent',

			type: 'callGlobal',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'tiktok-pixel',
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
export const tiktokPixel = function tiktokPixel({
	pixelId,
	scriptSrc,
}: TikTokPixelOptions): Script {
	const resolved = resolveManifest(tiktokPixelManifest, {
		pixelId,
		scriptSrc: scriptSrc ?? 'https://analytics.tiktok.com/i18n/pixel/events.js',
	});

	return resolved;
};
