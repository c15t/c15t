import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

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
	/** Project DSN for self-hosted or non-Vercel deployments. */
	dsn?: string;
	/** Disable automatic pageview tracking. */
	disableAutoTrack?: boolean;
	/** Preferred script mode. */
	mode?: VercelAnalyticsMode;
	/** Load Vercel's debug bundle when set to `true`. */
	debug?: boolean;
	/** Custom ingestion endpoint. */
	endpoint?: string;
	/** Custom loader URL. */
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
 * @param options - The options for the Vercel Analytics script.
 * @returns The Vercel Analytics script.
 */
export function vercelAnalytics(
	options: VercelAnalyticsOptions = {}
): Script {
	let disableAutoTrackAttribute: string | undefined;
	if (options.disableAutoTrack) {
		disableAutoTrackAttribute = '1';
	}

	return resolveManifest(vercelAnalyticsManifest, {
		scriptUrl: getVercelScriptUrl(options),
		dsn: options.dsn,
		endpoint: options.endpoint,
		disableAutoTrackAttribute,
	});
}
