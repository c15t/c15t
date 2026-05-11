import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

export type RedditPixelEventName =
	| 'PageVisit'
	| 'ViewContent'
	| 'Search'
	| 'AddToCart'
	| 'AddToWishlist'
	| 'Purchase'
	| 'Lead'
	| 'SignUp';

type RedditPixelFunction = {
	(command: 'init', pixelId: string): void;
	(
		command: 'track',
		eventName: RedditPixelEventName | (string & {}),
		properties?: Record<string, unknown>
	): void;
	(command: string, ...args: unknown[]): void;
};

declare global {
	interface Window {
		rdt: RedditPixelFunction & {
			callQueue?: unknown[][];
			sendEvent?: (rdt: Window['rdt'], args: unknown[]) => void;
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
	scriptUrl,
}: RedditPixelOptions): Script {
	const install: VendorManifest['install'] = [
		{
			type: 'callGlobal',
			global: 'rdt',
			args: ['init', '{{pixelId}}'],
		},
	];

	if (trackPageVisit) {
		install.push({
			type: 'callGlobal',
			global: 'rdt',
			args: ['track', 'PageVisit'],
		});
	}

	install.push({
		type: 'loadScript',
		src: '{{scriptUrl}}',
		async: true,
	});

	const manifest = {
		...redditPixelManifest,
		install,
	} as const satisfies VendorManifest;

	return resolveManifest(manifest, {
		pixelId,
		scriptUrl: scriptUrl ?? 'https://www.redditstatic.com/ads/pixel.js',
	});
}
