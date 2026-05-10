import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

export type SnapchatPixelEventName =
	| 'PAGE_VIEW'
	| 'VIEW_CONTENT'
	| 'ADD_CART'
	| 'SIGN_UP'
	| 'SAVE'
	| 'START_CHECKOUT'
	| 'APP_OPEN'
	| 'ADD_BILLING'
	| 'SEARCH'
	| 'SUBSCRIBE'
	| 'AD_CLICK'
	| 'AD_VIEW'
	| 'COMPLETE_TUTORIAL'
	| 'LEVEL_COMPLETE'
	| 'INVITE'
	| 'LOGIN'
	| 'SHARE'
	| 'RESERVE'
	| 'ACHIEVEMENT_UNLOCKED'
	| 'ADD_TO_WISHLIST'
	| 'SPENT_CREDITS'
	| 'RATE'
	| 'START_TRIAL'
	| 'LIST_VIEW';

export interface SnapchatPixelEventProperties {
	price?: number;
	client_dedup_id?: string;
	currency?: string;
	transaction_id?: string;
	item_ids?: string[];
	item_category?: string;
	description?: string;
	search_string?: string;
	number_items?: number;
	payment_info_available?: 0 | 1;
	sign_up_method?: string;
	success?: 0 | 1;
	brands?: string[];
	delivery_method?: 'in_store' | 'curbside' | 'delivery';
	customer_status?: 'new' | 'returning' | 'reactivated';
	event_tag?: string;
	[key: string]: unknown;
}

type SnapchatPixelFunction = {
	(
		command: 'track',
		eventName: SnapchatPixelEventName | (string & {}),
		properties?: SnapchatPixelEventProperties
	): void;
	(command: 'init', pixelId: string, config?: Record<string, unknown>): void;
	(command: string, ...args: unknown[]): void;
};

declare global {
	interface Window {
		snaptr: SnapchatPixelFunction & {
			handleRequest?: (...args: unknown[]) => void;
			loaded?: boolean;
			push?: Window['snaptr'];
			queue?: unknown[][];
			version?: string;
		};
		_snaptr?: Window['snaptr'];
	}
}

/**
 * Snapchat Pixel vendor manifest.
 *
 * Uses a structured queue stub and queues `init` plus an optional
 * `PAGE_VIEW` event before the vendor bundle loads.
 */
export const snapchatPixelManifest = {
	...vendorManifestContract,
	vendor: 'snapchat-pixel',
	category: 'marketing',
	bootstrap: [
		{
			type: 'defineStubFunction',
			name: 'snaptr',
			queue: {
				property: 'queue',
			},
			dispatchProperty: 'handleRequest',
			queueFormat: 'array',
			aliases: ['_snaptr'],
			selfReferences: ['push'],
			properties: {
				loaded: true,
				version: '1.0',
			},
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'callGlobal',
			global: 'snaptr',
			args: ['init', '{{pixelId}}', '{{initOptions}}'],
		},
		{
			type: 'callGlobal',
			global: 'snaptr',
			args: ['track', 'PAGE_VIEW'],
		},
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface SnapchatPixelOptions {
	/**
	 * Your Snapchat Pixel ID.
	 * @example `123456789012345`
	 */
	pixelId: string;

	/** Optional init payload passed to `snaptr('init', ...)`. */
	initOptions?: Record<string, unknown>;

	/**
	 * Queue the default `PAGE_VIEW` event during setup.
	 * @default true
	 */
	trackPageView?: boolean;

	/** Snapchat Pixel loader URL. */
	scriptSrc?: string;
}

/**
 * Creates a Snapchat Pixel script.
 *
 * @param options - The options for the Snapchat Pixel script
 * @returns The Snapchat Pixel script configuration
 *
 * @example
 * ```ts
 * const snapchatPixelScript = snapchatPixel({
 *   pixelId: '123456789012345',
 * });
 * ```
 *
 * @see {@link https://businesshelp.snapchat.com/s/article/pixel-website-install} Snapchat Pixel documentation
 */
export function snapchatPixel({
	pixelId,
	initOptions,
	trackPageView = true,
	scriptSrc,
}: SnapchatPixelOptions): Script {
	const install = [
		{
			type: 'callGlobal',
			global: 'snaptr',
			args:
				initOptions === undefined
					? ['init', '{{pixelId}}']
					: ['init', '{{pixelId}}', '{{initOptions}}'],
		},
		...(trackPageView
			? [
					{
						type: 'callGlobal',
						global: 'snaptr',
						args: ['track', 'PAGE_VIEW'],
					},
				]
			: []),
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	] as const;

	const manifest = {
		...snapchatPixelManifest,
		install,
	} as const satisfies VendorManifest;

	const resolved = resolveManifest(manifest, {
		pixelId,
		initOptions: initOptions ?? {},
		scriptSrc: scriptSrc ?? 'https://sc-static.net/scevent.min.js',
	});

	return resolved;
}
