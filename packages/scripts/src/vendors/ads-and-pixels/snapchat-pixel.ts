import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

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
			src: '{{scriptUrl}}',
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
	scriptUrl?: string;
}

/**
 * Creates a Snapchat Pixel script.
 *
 * @param options.pixelId - Snapchat Pixel ID used in `snaptr('init', ...)`.
 *   Expected format is a numeric string (commonly 15 digits), for example
 *   `'123456789012345'`. This value is required and should come directly from
 *   Snapchat Ads Manager.
 * @param options.initOptions - Optional object passed as the third argument to
 *   `snaptr('init', pixelId, initOptions)`, for advanced initialization values.
 *   Example: `{ user_email: 'user@example.com', user_phone_number: '+15551234567' }`.
 * @param options.trackPageView - Whether to queue the default
 *   `snaptr('track', 'PAGE_VIEW')` call during setup. Defaults to `true`; set to
 *   `false` when you want to control page-view tracking manually.
 * @returns A resolved c15t `Script` configuration that defines the Snapchat
 *   queue stub, runs `init` (and optionally `PAGE_VIEW`), and then loads the
 *   Snapchat SDK script URL.
 * @throws `resolveManifest` may throw when required placeholders cannot be
 *   resolved (for example, when `pixelId` is missing/empty) or when provided
 *   manifest values are invalid for interpolation.
 *
 * Edge cases:
 * - Missing `pixelId` causes manifest resolution to fail.
 * - Non-numeric or malformed `pixelId` values may initialize incorrectly in
 *   Snapchat even if local script construction succeeds.
 *
 * @example
 * ```ts
 * const script = snapchatPixel({
 * 	pixelId: '123456789012345',
 * 	initOptions: {
 * 		user_email: 'user@example.com',
 * 		user_phone_number: '+15551234567',
 * 	},
 * 	trackPageView: false,
 * });
 * ```
 */
export function snapchatPixel({
	pixelId,
	initOptions,
	trackPageView = true,
	scriptUrl,
}: SnapchatPixelOptions): Script {
	const initArgs: unknown[] = ['init', '{{pixelId}}'];
	if (initOptions !== undefined) {
		initArgs.push('{{initOptions}}');
	}

	const install: VendorManifest['install'] = [
		{
			type: 'callGlobal',
			global: 'snaptr',
			args: initArgs,
		},
	];

	if (trackPageView) {
		install.push({
			type: 'callGlobal',
			global: 'snaptr',
			args: ['track', 'PAGE_VIEW'],
		});
	}

	install.push({
		type: 'loadScript',
		src: '{{scriptUrl}}',
		async: true,
	});

	const manifest = {
		...snapchatPixelManifest,
		install,
	} as const satisfies VendorManifest;

	return resolveManifest(manifest, {
		pixelId,
		initOptions: initOptions ?? {},
		scriptUrl: scriptUrl ?? 'https://sc-static.net/scevent.min.js',
	});
}
