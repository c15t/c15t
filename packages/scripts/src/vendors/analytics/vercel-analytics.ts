import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';

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
	bootstrap: [
		{
			ifUndefined: true,

			name: 'vaq',
			type: 'setGlobal',
			value: [],
		},
		{
			ifUndefined: true,

			name: 'va',
			queue: {
				global: 'vaq',
			},
			queueFormat: 'array',
			type: 'defineStubFunction',
		},
	],
	category: 'measurement',
	install: [
		{
			attributes: {
				'data-disable-auto-track': '{{disableAutoTrackAttribute}}',
				'data-dsn': '{{dsn}}',
				'data-endpoint': '{{endpoint}}',

				'data-sdkn': 'c15t',
			},

			defer: true,
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'vercel-analytics',
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

const getVercelScriptUrl = function getVercelScriptUrl(
	options: VercelAnalyticsOptions
): string {
	if (options.scriptUrl) {
		return options.scriptUrl;
	}
	if (options.mode === 'development' || options.debug) {
		return 'https://va.vercel-scripts.com/v1/script.debug.js';
	}

	return 'https://va.vercel-scripts.com/v1/script.js';
};

/**
 * Creates a Vercel Analytics script.
 *
 * @param options - The options for the Vercel Analytics script.
 * @returns The Vercel Analytics script.
 */
export const vercelAnalytics = function vercelAnalytics(
	options: VercelAnalyticsOptions = {}
): Script {
	let disableAutoTrackAttribute: string | undefined;
	if (options.disableAutoTrack) {
		disableAutoTrackAttribute = '1';
	}

	return resolveManifest(vercelAnalyticsManifest, {
		disableAutoTrackAttribute,
		dsn: options.dsn,
		endpoint: options.endpoint,
		scriptUrl: getVercelScriptUrl(options),
	});
};
