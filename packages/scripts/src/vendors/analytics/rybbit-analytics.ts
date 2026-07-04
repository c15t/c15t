import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { booleanDataAttribute } from '../_shared/attributes';
import { joinUrlPath } from '../_shared/script-url';

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
	/** Your Rybbit site ID. */
	siteId: string | number;
	/** Automatically track pageviews. */
	autoTrackPageview?: boolean;
	/** Enable SPA route tracking. */
	trackSpa?: boolean;
	/** Include query parameters in tracked URLs. */
	trackQuery?: boolean;
	/** Track outbound link clicks. */
	trackOutbound?: boolean;
	/** Track JavaScript errors. */
	trackErrors?: boolean;
	/** Enable session replay. */
	sessionReplay?: boolean;
	/** Enable Web Vitals tracking. */
	webVitals?: boolean;
	/** URL patterns to skip from tracking. */
	skipPatterns?: string[];
	/** URL patterns to mask in tracked data. */
	maskPatterns?: string[];
	/** Debounce interval for pageview tracking. */
	debounce?: number;
	/** API key for authenticated tracking. */
	apiKey?: string;
	/** Override the analytics host URL. */
	analyticsHost?: string;
	/** Custom loader URL. */
	scriptUrl?: string;
}

/**
 * Resolves the Rybbit Analytics script URL.
 *
 * Uses `options.scriptUrl` when provided, falls back to
 * `options.analyticsHost` joined with `script.js`, and defaults to
 * `https://app.rybbit.io/api/script.js`.
 *
 * @param options - Rybbit Analytics options.
 * @returns The resolved script URL.
 *
 * @internal
 */
function getRybbitScriptUrl(options: RybbitAnalyticsOptions): string {
	const url = options.scriptUrl?.trim();
	if (url && url.length > 0) {
		return url;
	}
	if (options.analyticsHost) {
		return joinUrlPath(options.analyticsHost, 'script.js');
	}

	return 'https://app.rybbit.io/api/script.js';
}

/**
 * Creates a Rybbit Analytics script.
 *
 * @param options - The options for the Rybbit Analytics script.
 * @returns The Rybbit Analytics script.
 * @throws {Error} Throws `rybbitAnalytics: missing siteId` when
 * `options.siteId` is undefined, null, or trims to an empty string. Provide a
 * valid non-empty site ID string to prevent this error.
 */
export function rybbitAnalytics(options: RybbitAnalyticsOptions): Script {
	let siteId: string;
	if (options.siteId === undefined || options.siteId === null) {
		siteId = '';
	} else {
		siteId = String(options.siteId).trim();
	}
	if (siteId.length === 0) {
		throw new Error('rybbitAnalytics: missing siteId');
	}

	let debounce: string | undefined;
	if (options.debounce !== undefined) {
		debounce = String(options.debounce);
	}

	let skipPatterns: string | undefined;
	if (options.skipPatterns) {
		skipPatterns = JSON.stringify(options.skipPatterns);
	}

	let maskPatterns: string | undefined;
	if (options.maskPatterns) {
		maskPatterns = JSON.stringify(options.maskPatterns);
	}

	return resolveManifest(rybbitAnalyticsManifest, {
		scriptUrl: getRybbitScriptUrl(options),
		siteId,
		autoTrackPageview: booleanDataAttribute(options.autoTrackPageview),
		trackSpa: booleanDataAttribute(options.trackSpa),
		trackQuery: booleanDataAttribute(options.trackQuery),
		trackOutbound: booleanDataAttribute(options.trackOutbound),
		trackErrors: booleanDataAttribute(options.trackErrors),
		sessionReplay: booleanDataAttribute(options.sessionReplay),
		webVitals: booleanDataAttribute(options.webVitals),
		skipPatterns,
		maskPatterns,
		debounce,
		apiKey: options.apiKey,
	});
}
