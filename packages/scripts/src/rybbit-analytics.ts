import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

declare global {
	interface Window {
		rybbit?: {
			clearUserId: () => void;
			event: (name: string, properties?: Record<string, unknown>) => void;
			getUserId: () => string | null;
			identify: (userId: string) => void;
			pageview: () => void;
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
 * Rybbit Analytics vendor manifest.
 *
 * Rybbit reads its configuration from script data attributes at load time.
 */
export const rybbitAnalyticsManifest = {
	...vendorManifestContract,
	vendor: 'rybbit-analytics',
	category: 'measurement',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			defer: true,
			attributes: {
				'data-site-id': '{{siteId}}',
				'data-auto-track-pageview': '{{autoTrackPageview}}',
				'data-track-spa': '{{trackSpa}}',
				'data-track-query': '{{trackQuery}}',
				'data-track-outbound': '{{trackOutbound}}',
				'data-track-errors': '{{trackErrors}}',
				'data-session-replay': '{{sessionReplay}}',
				'data-web-vitals': '{{webVitals}}',
				'data-skip-patterns': '{{skipPatterns}}',
				'data-mask-patterns': '{{maskPatterns}}',
				'data-debounce': '{{debounce}}',
				'data-api-key': '{{apiKey}}',
			},
		},
	],
} as const satisfies VendorManifest;

export interface RybbitAnalyticsOptions {
	/**
	 * Your Rybbit site ID.
	 */
	siteId: string | number;

	/**
	 * Automatically track pageviews.
	 */
	autoTrackPageview?: boolean;

	/**
	 * Enable SPA route tracking.
	 */
	trackSpa?: boolean;

	/**
	 * Include query parameters in tracked URLs.
	 */
	trackQuery?: boolean;

	/**
	 * Track outbound link clicks.
	 */
	trackOutbound?: boolean;

	/**
	 * Track JavaScript errors.
	 */
	trackErrors?: boolean;

	/**
	 * Enable session replay.
	 */
	sessionReplay?: boolean;

	/**
	 * Enable Web Vitals tracking.
	 */
	webVitals?: boolean;

	/**
	 * URL patterns to skip from tracking.
	 */
	skipPatterns?: string[];

	/**
	 * URL patterns to mask in tracked data.
	 */
	maskPatterns?: string[];

	/**
	 * Debounce interval for pageview tracking.
	 */
	debounce?: number;

	/**
	 * API key for authenticated tracking.
	 */
	apiKey?: string;

	/**
	 * Override the analytics host URL.
	 */
	analyticsHost?: string;

	/**
	 * Custom loader URL.
	 */
	scriptUrl?: string;
}

function getRybbitScriptUrl(options: RybbitAnalyticsOptions): string {
	if (options.scriptUrl) {
		return options.scriptUrl;
	}

	if (options.analyticsHost) {
		return `${options.analyticsHost}/script.js`;
	}

	return 'https://app.rybbit.io/api/script.js';
}

/**
 * Creates a Rybbit Analytics script.
 *
 * The upstream registry helper adds a client-side queue wrapper around the global
 * API. c15t's manifest engine cannot serialize that wrapper, so this helper
 * keeps only the declarative script configuration.
 *
 * @see https://rybbit.io/docs
 *
 * @param options - The options for the Rybbit Analytics script.
 * @returns The Rybbit Analytics script.
 */
export function rybbitAnalytics(options: RybbitAnalyticsOptions): Script {
	const resolved = resolveManifest(rybbitAnalyticsManifest, {
		scriptUrl: getRybbitScriptUrl(options),
		siteId: String(options.siteId),
		autoTrackPageview: booleanAttribute(options.autoTrackPageview),
		trackSpa: booleanAttribute(options.trackSpa),
		trackQuery: booleanAttribute(options.trackQuery),
		trackOutbound: booleanAttribute(options.trackOutbound),
		trackErrors: booleanAttribute(options.trackErrors),
		sessionReplay: booleanAttribute(options.sessionReplay),
		webVitals: booleanAttribute(options.webVitals),
		skipPatterns: options.skipPatterns
			? JSON.stringify(options.skipPatterns)
			: undefined,
		maskPatterns: options.maskPatterns
			? JSON.stringify(options.maskPatterns)
			: undefined,
		debounce:
			options.debounce === undefined ? undefined : String(options.debounce),
		apiKey: options.apiKey,
	});

	return resolved;
}
