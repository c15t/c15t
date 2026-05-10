import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

export type VercelAnalyticsMode = 'auto' | 'development' | 'production';

declare global {
	interface Window {
		va?: (event: string, properties?: unknown) => void;
		vaq?: [string, unknown?][];
		vam?: 'development' | 'production';
	}
}

/**
 * Vercel Analytics vendor manifest.
 *
 * Seeds Vercel's event queue before loading the tracker bundle.
 */
export const vercelAnalyticsManifest = {
	...vendorManifestContract,
	vendor: 'vercel-analytics',
	category: 'measurement',
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'vaq',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'defineStubFunction',
			name: 'va',
			queue: {
				global: 'vaq',
			},
			queueFormat: 'array',
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			defer: true,
			attributes: {
				'data-sdkn': 'c15t',
				'data-dsn': '{{dsn}}',
				'data-disable-auto-track': '{{disableAutoTrackAttribute}}',
				'data-endpoint': '{{endpoint}}',
			},
		},
	],
} as const satisfies VendorManifest;

export interface VercelAnalyticsOptions {
	/**
	 * Project DSN for self-hosted or non-Vercel deployments.
	 */
	dsn?: string;

	/**
	 * Disable automatic pageview tracking.
	 */
	disableAutoTrack?: boolean;

	/**
	 * Preferred script mode.
	 *
	 * The c15t manifest helper uses this only to choose the default script URL.
	 */
	mode?: VercelAnalyticsMode;

	/**
	 * Load Vercel's debug bundle when set to `true`.
	 */
	debug?: boolean;

	/**
	 * Custom ingestion endpoint.
	 */
	endpoint?: string;

	/**
	 * Custom loader URL.
	 */
	scriptUrl?: string;
}

function getVercelScriptUrl(options: VercelAnalyticsOptions): string {
	if (options.scriptUrl) {
		return options.scriptUrl;
	}

	if (options.mode === 'development' || options.debug) {
		return 'https://va.vercel-scripts.com/v1/script.debug.js';
	}

	return 'https://va.vercel-scripts.com/v1/script.js';
}

/**
 * Creates a Vercel Analytics script.
 *
 * This helper keeps Vercel Analytics declarative by preserving only the queue
 * bootstrap and load-time attributes. Runtime callbacks such as `beforeSend`
 * are intentionally omitted.
 *
 * @see https://vercel.com/docs/analytics
 *
 * @param options - The options for the Vercel Analytics script.
 * @returns The Vercel Analytics script.
 */
export function vercelAnalytics(options: VercelAnalyticsOptions = {}): Script {
	const resolved = resolveManifest(vercelAnalyticsManifest, {
		scriptUrl: getVercelScriptUrl(options),
		dsn: options.dsn,
		endpoint: options.endpoint,
		disableAutoTrackAttribute: options.disableAutoTrack ? '1' : undefined,
	});

	return resolved;
}
