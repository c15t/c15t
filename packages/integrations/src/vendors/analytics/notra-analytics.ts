import type { Script, ScriptCallbackInfo } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { stripTrailingSlashes, trimToUndefined } from '../_shared/script-url';

const scriptHost = 'https://static.usenotra.com';

const defaultApiUrl = 'https://ingest.usenotra.com/api/collect';

const webKeyPrefix = 'nwk.';

const pinnedBuilds = {
	plus: {
		file: 'notra.plus.d703b9cc5508.js',
		integrity:
			'sha384-MgLdHKufD0WdkO4pxtkT/bbNCKxl6PxOyUJe+M/qwFGfjOdZ5rEnljxTlOVQIzF+',
	},
	standard: {
		file: 'notra.ce3c872ef9c9.js',
		integrity:
			'sha384-LuUp5Hj+rSQ4/mZp1sWBOrJDHIHKGqflwF1GYIreqmWdCaI1otOQealWJGRj6Toj',
	},
} as const;

/**
 * Notra web analytics vendor manifest.
 *
 * `notra.js` reads its web key, collection endpoint and hash routing switch
 * from the `data-*` attributes of its own script element. It sets no cookie,
 * writes no browser storage and defines no global, and it has no stop or
 * opt-out call, so the manifest has no consent steps.
 */
export const notraAnalyticsManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			async: true,
			attributes: {
				crossorigin: '{{crossorigin}}',
				'data-api': '{{apiUrl}}',
				'data-hash': '{{hash}}',
				'data-key': '{{webKey}}',
				integrity: '{{integrity}}',
			},
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'notra-analytics',
	vendorDetails: {
		homepageUrl: 'https://www.usenotra.com/',
		legalName: 'Notra, Inc.',
		name: 'Notra',
		privacyPolicyUrl: 'https://www.usenotra.com/privacy',
	},
} as const satisfies VendorManifest;

export interface NotraAnalyticsOptions {
	/**
	 * Your project's public web key, which starts with `nwk.`. Copy it from the
	 * script tag under Settings, Tracking in Notra.
	 */
	webKey: string;

	/**
	 * Loads `notra.plus.js`, which also reports uncaught JavaScript errors and
	 * unhandled promise rejections.
	 * @default false
	 */
	errors?: boolean;

	/**
	 * Counts `#hash` route changes as page views. Sets `data-hash`.
	 * @default false
	 */
	hash?: boolean;

	/**
	 * The URL that receives page views. Sets `data-api`. With `endpoint` or
	 * `scriptUrl`, the default is `/api/collect` on the origin the script
	 * loaded from.
	 * @default 'https://ingest.usenotra.com/api/collect'
	 */
	apiUrl?: string;

	/**
	 * Origin of a self-hosted ingest or a proxy. The pinned build loads from
	 * `/api/` on that origin, with subresource integrity, and page views go to
	 * `/api/collect` on it.
	 * @default 'https://static.usenotra.com' for the script
	 */
	endpoint?: string;

	/**
	 * Full URL of the `notra.js` file. Overrides `endpoint` and `errors`, and
	 * loads without subresource integrity.
	 * @default 'https://static.usenotra.com/notra.ce3c872ef9c9.js'
	 */
	scriptUrl?: string;
}

const resolveSource = function resolveSource(options: NotraAnalyticsOptions): {
	apiUrl: string | undefined;
	integrity: string | undefined;
	scriptUrl: string;
} {
	const apiUrl = trimToUndefined(options.apiUrl);
	const scriptUrl = trimToUndefined(options.scriptUrl);
	if (scriptUrl !== undefined) {
		return { apiUrl, integrity: undefined, scriptUrl };
	}

	const build = options.errors ? pinnedBuilds.plus : pinnedBuilds.standard;
	const endpoint = trimToUndefined(options.endpoint);
	if (endpoint !== undefined) {
		return {
			apiUrl,
			integrity: build.integrity,
			scriptUrl: `${stripTrailingSlashes(endpoint)}/api/${build.file}`,
		};
	}

	return {
		apiUrl: apiUrl ?? defaultApiUrl,
		integrity: build.integrity,
		scriptUrl: `${scriptHost}/${build.file}`,
	};
};

const scriptElements = new Map<string, HTMLScriptElement>();

const rememberElement = function rememberElement(
	info: ScriptCallbackInfo
): void {
	if (info.element) {
		scriptElements.set(info.elementId, info.element);
	}
};

const dropKeyOnRefusal = function dropKeyOnRefusal(
	info: ScriptCallbackInfo
): void {
	if (info.hasConsent) {
		return;
	}
	scriptElements.get(info.elementId)?.removeAttribute('data-key');
	scriptElements.delete(info.elementId);
};

/**
 * Loads Notra web analytics, `notra.js`, once measurement consent is granted.
 *
 * The helper loads the build that `@usenotra/sdk` 2.0.0 pins, with subresource
 * integrity. `notra.js` sets no cookie and writes no browser storage, and it
 * has no stop call. A refusal while the file is still downloading keeps it
 * from sending. After the file has run, only a page load stops it, so keep
 * c15t's default reload on revocation.
 *
 * @see https://github.com/usenotra/typescript-sdk/blob/main/docs/tracking/README.md#web-analytics-script
 *
 * @param options - Notra web key and optional build, routing and host settings.
 * @returns The consent-gated Notra script.
 * @remarks When `webKey` is missing, blank or does not start with `nwk.`, the
 *   helper logs `notraAnalytics: missing or invalid webKey` with
 *   `console.error` and returns a script that never loads.
 *
 * @example
 * ```ts
 * import { notraAnalytics } from '@c15t/integrations/notra-analytics';
 *
 * notraAnalytics({ webKey: 'nwk.your_web_key' });
 * ```
 */
export const notraAnalytics = function notraAnalytics(
	options: NotraAnalyticsOptions
): Script {
	const webKey = readId(options?.webKey);
	if (webKey === undefined || !webKey.startsWith(webKeyPrefix)) {
		return skipMissingId('notraAnalytics', 'webKey', {
			category: 'measurement',
			manifest: notraAnalyticsManifest,
		});
	}

	const source = resolveSource(options);
	return {
		...resolveManifest(notraAnalyticsManifest, {
			apiUrl: source.apiUrl,
			crossorigin: source.integrity ? 'anonymous' : undefined,
			hash: options.hash ? '' : undefined,
			integrity: source.integrity,
			scriptUrl: source.scriptUrl,
			webKey,
		}),
		onBeforeLoad: rememberElement,
		onConsentChange: dropKeyOnRefusal,
	};
};
