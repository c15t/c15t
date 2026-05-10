import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

declare global {
	interface Window {
		AhrefsAnalytics?: {
			sendEvent: (
				name: string,
				options?: {
					props?: Record<string, string>;
					meta?: Record<string, unknown>;
				}
			) => void;
		};
	}
}

/**
 * Ahrefs Analytics vendor manifest.
 *
 * Loads Ahrefs Web Analytics and passes the project key via `data-key`. Ahrefs
 * Web Analytics is cookieless, so the script is consent-gated on `measurement`
 * and unloaded when consent is revoked.
 */
export const ahrefsAnalyticsManifest = {
	...vendorManifestContract,
	vendor: 'ahrefs-analytics',
	category: 'measurement',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
			attributes: {
				'data-key': '{{key}}',
			},
		},
	],
} as const satisfies VendorManifest;

export interface AhrefsAnalyticsOptions {
	/**
	 * Your Ahrefs Web Analytics project key.
	 */
	key: string;

	/**
	 * Custom loader URL.
	 * @default 'https://analytics.ahrefs.com/analytics.js'
	 */
	scriptUrl?: string;
}

/**
 * Creates an Ahrefs Analytics script.
 *
 * The Ahrefs SDK exposes its runtime API on `window.AhrefsAnalytics` after
 * load. This helper only models the serializable script manifest.
 *
 * @see https://ahrefs.com/web-analytics
 *
 * @param options - The options for the Ahrefs Analytics script.
 * @returns The Ahrefs Analytics script.
 *
 * @example
 * ```ts
 * import { ahrefsAnalytics } from '@c15t/scripts/ahrefs-analytics';
 *
 * ahrefsAnalytics({ key: 'YOUR_PROJECT_KEY' });
 * ```
 */
export function ahrefsAnalytics(options: AhrefsAnalyticsOptions): Script {
	const resolved = resolveManifest(ahrefsAnalyticsManifest, {
		key: options.key,
		scriptUrl: options.scriptUrl ?? 'https://analytics.ahrefs.com/analytics.js',
	});

	return resolved;
}
