import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

export type PlausibleExtension =
	| 'hash'
	| 'outbound-links'
	| 'file-downloads'
	| 'tagged-events'
	| 'revenue'
	| 'pageview-props'
	| 'compat'
	| 'local'
	| 'manual';

export interface PlausibleInitOptions {
	customProperties?: Record<string, unknown>;
	endpoint?: string;
	fileDownloads?: {
		fileExtensions?: string[];
	};
	hashBasedRouting?: boolean;
	autoCapturePageviews?: boolean;
	captureOnLocalhost?: boolean;
}

declare global {
	interface Window {
		plausible?: ((...args: unknown[]) => void) & {
			o?: PlausibleInitOptions;
			q?: unknown[][];
		};
	}
}

function buildPlausibleScriptUrl(options: PlausibleAnalyticsOptions): string {
	if (options.scriptId) {
		return `https://plausible.io/js/pa-${options.scriptId}.js`;
	}

	if (options.extension) {
		const extensions = Array.isArray(options.extension)
			? options.extension.join('.')
			: options.extension;

		return `https://plausible.io/js/script.${extensions}.js`;
	}

	return 'https://plausible.io/js/script.js';
}

function buildPlausibleInitOptions(
	options: PlausibleAnalyticsOptions
): PlausibleInitOptions {
	const initOptions: PlausibleInitOptions = {};

	if (options.customProperties) {
		initOptions.customProperties = options.customProperties;
	}

	if (options.scriptId && options.endpoint) {
		initOptions.endpoint = options.endpoint;
	}

	if (options.fileDownloads) {
		initOptions.fileDownloads = options.fileDownloads;
	}

	if (options.hashBasedRouting !== undefined) {
		initOptions.hashBasedRouting = options.hashBasedRouting;
	}

	if (options.autoCapturePageviews !== undefined) {
		initOptions.autoCapturePageviews = options.autoCapturePageviews;
	}

	if (options.captureOnLocalhost !== undefined) {
		initOptions.captureOnLocalhost = options.captureOnLocalhost;
	}

	return initOptions;
}

/**
 * Plausible Analytics vendor manifest.
 *
 * Seeds a small queue stub so early `window.plausible(...)` calls can be
 * buffered before the real tracker loads. Plausible is cookieless and only
 * tracks page views, so the script is gated on `measurement` consent and is
 * unloaded when consent is revoked.
 */
export const plausibleAnalyticsManifest = {
	...vendorManifestContract,
	vendor: 'plausible-analytics',
	category: 'measurement',
	bootstrap: [
		{
			type: 'defineStubFunction',
			name: 'plausible',
			queue: {
				property: 'q',
			},
			queueFormat: 'array',
			properties: {
				o: '{{initOptions}}',
			},
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			defer: true,
			attributes: {
				'data-domain': '{{domain}}',
				'data-api': '{{apiAttribute}}',
			},
		},
	],
} as const satisfies VendorManifest;

export interface PlausibleAnalyticsOptions {
	/**
	 * Unique Plausible script ID for the new script format.
	 */
	scriptId?: string;

	/**
	 * Legacy domain-based site identifier.
	 */
	domain?: string;

	/**
	 * Legacy script extensions.
	 */
	extension?: PlausibleExtension | PlausibleExtension[];

	/**
	 * Properties tracked with each pageview.
	 */
	customProperties?: Record<string, unknown>;

	/**
	 * Custom tracking endpoint.
	 */
	endpoint?: string;

	/**
	 * File download tracking configuration.
	 */
	fileDownloads?: {
		fileExtensions?: string[];
	};

	/**
	 * Enable hash-based routing support.
	 */
	hashBasedRouting?: boolean;

	/**
	 * Disable automatic pageview capture when set to `false`.
	 */
	autoCapturePageviews?: boolean;

	/**
	 * Enable tracking on localhost.
	 */
	captureOnLocalhost?: boolean;

	/**
	 * Custom loader URL.
	 */
	scriptUrl?: string;
}

/**
 * Creates a Plausible Analytics script.
 *
 * Models Plausible's queue bootstrap and loader attributes as a c15t-managed
 * script. Supports both the new `scriptId`-based loader and the legacy
 * `domain` + extension-based loader.
 *
 * @see https://plausible.io/docs/script-extensions
 *
 * @param options - The options for the Plausible Analytics script.
 * @returns The Plausible Analytics script.
 *
 * @example
 * ```ts
 * import { plausibleAnalytics } from '@c15t/scripts/plausible-analytics';
 *
 * plausibleAnalytics({
 *   domain: 'example.com',
 *   extension: ['file-downloads', 'outbound-links'],
 * });
 * ```
 */
export function plausibleAnalytics(options: PlausibleAnalyticsOptions): Script {
	const resolved = resolveManifest(plausibleAnalyticsManifest, {
		scriptUrl: options.scriptUrl ?? buildPlausibleScriptUrl(options),
		domain: options.scriptId ? undefined : options.domain,
		apiAttribute: options.scriptId ? undefined : options.endpoint,
		initOptions: buildPlausibleInitOptions(options),
	});

	return resolved;
}
