import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

declare global {
	interface Window {
		umami?: {
			identify: (sessionData?: Record<string, unknown> | string) => void;
			track: {
				(payload?: Record<string, unknown>): void;
				(eventName: string, eventData?: Record<string, unknown>): void;
			};
		};
	}
}

function booleanAttribute(value: boolean | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	return value ? 'true' : 'false';
}

function listAttribute(
	value: string[] | string | undefined
): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	return Array.isArray(value) ? value.join(',') : value;
}

/**
 * Umami Analytics vendor manifest.
 *
 * Configures Umami entirely through script `data-*` attributes. Umami is a
 * cookieless analytics product, so the script is consent-gated on
 * `measurement` and unloaded when consent is revoked.
 */
export const umamiAnalyticsManifest = {
	...vendorManifestContract,
	vendor: 'umami-analytics',
	category: 'measurement',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			defer: true,
			attributes: {
				'data-website-id': '{{websiteId}}',
				'data-host-url': '{{hostUrl}}',
				'data-auto-track': '{{autoTrackAttribute}}',
				'data-domains': '{{domains}}',
				'data-tag': '{{tag}}',
				'data-before-send': '{{beforeSend}}',
			},
		},
	],
} as const satisfies VendorManifest;

export interface UmamiAnalyticsOptions {
	/**
	 * Your Umami website ID.
	 */
	websiteId: string;

	/**
	 * Override the host that receives analytics events.
	 */
	hostUrl?: string;

	/**
	 * Disable automatic tracking when set to `false`.
	 */
	autoTrack?: boolean;

	/**
	 * Restrict tracking to specific domains.
	 */
	domains?: string[] | string;

	/**
	 * Attach a tag to tracked events.
	 */
	tag?: string;

	/**
	 * Optional global hook name used for Umami's `data-before-send` attribute.
	 *
	 * Callback functions are intentionally not supported here because the c15t
	 * manifest runtime cannot serialize custom JavaScript functions.
	 */
	beforeSend?: string;

	/**
	 * Custom loader URL.
	 * @default 'https://cloud.umami.is/script.js'
	 */
	scriptUrl?: string;
}

/**
 * Creates an Umami Analytics script.
 *
 * @see https://umami.is/docs/tracker-config
 *
 * @param options - The options for the Umami Analytics script.
 * @returns The Umami Analytics script.
 *
 * @example
 * ```ts
 * import { umamiAnalytics } from '@c15t/scripts/umami-analytics';
 *
 * umamiAnalytics({
 *   websiteId: 'site-abc-123',
 *   domains: ['example.com', 'www.example.com'],
 * });
 * ```
 */
export function umamiAnalytics(options: UmamiAnalyticsOptions): Script {
	const resolved = resolveManifest(umamiAnalyticsManifest, {
		websiteId: options.websiteId,
		hostUrl: options.hostUrl,
		autoTrackAttribute: booleanAttribute(options.autoTrack),
		domains: listAttribute(options.domains),
		tag: options.tag,
		beforeSend: options.beforeSend,
		scriptUrl: options.scriptUrl ?? 'https://cloud.umami.is/script.js',
	});

	return resolved;
}
