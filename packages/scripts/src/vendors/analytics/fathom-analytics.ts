import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

declare global {
	interface Window {
		fathom?: {
			beacon: (context: { url: string; referrer?: string }) => void;
			blockTrackingForMe: () => void;
			enableTrackingForMe: () => void;
			isTrackingEnabled: () => boolean;
			send: (type: string, data: unknown) => void;
			setSite: (siteId: string) => void;
			siteId: string;
			trackEvent: (
				eventName: string,
				value?: {
					_site_id?: string;
					_value?: number;
				}
			) => void;
			trackGoal: (goalId: string, cents: number) => void;
			trackPageview: (context?: { url: string; referrer?: string }) => void;
		};
	}
}

function booleanAttribute(value: boolean | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	return value ? 'true' : 'false';
}

/**
 * Fathom Analytics vendor manifest.
 *
 * Configures Fathom via script `data-*` attributes. Fathom is a cookieless
 * analytics product, so the script is consent-gated on `measurement` and
 * unloaded when consent is revoked.
 */
export const fathomAnalyticsManifest = {
	...vendorManifestContract,
	vendor: 'fathom-analytics',
	category: 'measurement',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			defer: true,
			attributes: {
				'data-site': '{{site}}',
				'data-spa': '{{spa}}',
				'data-auto': '{{autoAttribute}}',
				'data-canonical': '{{canonicalAttribute}}',
				'data-honor-dnt': '{{honorDntAttribute}}',
			},
		},
	],
} as const satisfies VendorManifest;

export interface FathomAnalyticsOptions {
	/**
	 * Your Fathom Analytics site ID.
	 */
	site: string;

	/**
	 * The SPA tracking mode.
	 * @default 'auto'
	 */
	spa?: 'auto' | 'history' | 'hash';

	/**
	 * Automatically track page views.
	 */
	auto?: boolean;

	/**
	 * Enable canonical URL tracking.
	 */
	canonical?: boolean;

	/**
	 * Honor Do Not Track requests.
	 */
	honorDnt?: boolean;

	/**
	 * Custom loader URL.
	 * @default 'https://cdn.usefathom.com/script.js'
	 */
	scriptUrl?: string;
}

/**
 * Creates a Fathom Analytics script.
 *
 * @see https://usefathom.com/docs/script/script-settings
 *
 * @param options - The options for the Fathom Analytics script.
 * @returns The Fathom Analytics script.
 *
 * @example
 * ```ts
 * import { fathomAnalytics } from '@c15t/scripts/fathom-analytics';
 *
 * fathomAnalytics({
 *   site: 'SITE123',
 *   spa: 'history',
 *   canonical: true,
 * });
 * ```
 */
export function fathomAnalytics(options: FathomAnalyticsOptions): Script {
	const resolved = resolveManifest(fathomAnalyticsManifest, {
		site: options.site,
		spa: options.spa,
		autoAttribute: booleanAttribute(options.auto),
		canonicalAttribute: booleanAttribute(options.canonical),
		honorDntAttribute: booleanAttribute(options.honorDnt),
		scriptUrl: options.scriptUrl ?? 'https://cdn.usefathom.com/script.js',
	});

	return resolved;
}
