import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId, skipScript } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

declare global {
	interface Window {
		LogRocket?: {
			init: (appId: string, options?: Record<string, unknown>) => void;
			identify?: (id: string, traits?: Record<string, unknown>) => void;
			track?: (event: string, properties?: Record<string, unknown>) => void;
			getSessionURL?: (callback: (sessionUrl: string) => void) => void;
			start?: () => void;
			startNewSession?: () => void;
			uninstall?: () => void;
		};
	}
}

const DEFAULT_LOGROCKET_SCRIPT_URL =
	'https://cdn.logrocket.io/LogRocket.min.js';

const isLogRocketAppId = function isLogRocketAppId(appId: string): boolean {
	const segments = appId.split('/');

	return (
		segments.length === 2 && segments.every((segment) => segment.length > 0)
	);
};

/**
 * LogRocket vendor manifest.
 *
 * Loads the browser SDK and initializes it after the loader fires its `load`
 * event. LogRocket does not document a consent opt-out or stop-recording API
 * for the web SDK, so c15t gates the loader on measurement consent and unloads
 * the script element when that consent is revoked.
 */
export const logRocketManifest = {
	...vendorManifestContract,
	afterLoad: [
		{
			args: ['{{appId}}', '{{initOptions}}'],

			global: 'LogRocket',
			method: 'init',
			type: 'callGlobal',
		},
	],
	category: 'measurement',
	install: [
		{
			attributes: {
				crossorigin: 'anonymous',
			},

			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'logrocket',
	vendorDetails: {
		homepageUrl: 'https://logrocket.com/',
		legalName: 'LogRocket, Inc.',
		name: 'LogRocket',
		privacyPolicyUrl: 'https://logrocket.com/privacy',
	},
} as const satisfies VendorManifest;

const skippedLogRocketScript = {
	category: 'measurement',
	manifest: logRocketManifest,
} as const;

export interface LogRocketOptions {
	/**
	 * Your LogRocket app ID in `org-slug/app-slug` format.
	 */
	appId: string;

	/**
	 * LogRocket init options passed as the second `LogRocket.init()` argument.
	 *
	 * The manifest engine serializes this object as a template variable, so use
	 * JSON-serializable values only (no functions, class instances, prototypes,
	 * `Map`, `Set`, or other non-JSON types).
	 */
	initOptions?: Record<string, unknown>;

	/**
	 * Custom LogRocket loader URL.
	 * @default 'https://cdn.logrocket.io/LogRocket.min.js'
	 */
	scriptUrl?: string;

	/**
	 * Proxied URL for LogRocket's asynchronously loaded logger bundle.
	 *
	 * LogRocket's proxy setup requires `window._lrAsyncScript` in addition to
	 * the main `scriptUrl`, because the SDK chain-loads its logger bundle from
	 * this location. Only needed when proxying traffic through your own
	 * domain.
	 *
	 * @see https://docs.logrocket.com/docs/proxying-traffic-through-your-own-domain
	 */
	asyncScriptUrl?: string;
}

/**
 * Creates a LogRocket script.
 *
 * @see https://docs.logrocket.com/reference/init
 *
 * @param options - The options for the LogRocket script.
 * @returns The LogRocket script.
 *
 * @remarks
 * When `appId` is missing, blank, or not in `org/app` format, the helper
 * logs the problem with `console.error` and returns a script that never
 * loads. Use the app ID from LogRocket Project Setup.
 *
 * LogRocket records session replay and monitoring data. Configure LogRocket's
 * privacy and sanitization options before deployment so sensitive DOM, input,
 * network, or application state data is excluded from recordings.
 *
 * @example
 * ```ts
 * import { logRocket } from '@c15t/integrations/logrocket';
 *
 * logRocket({
 * 	appId: 'org-slug/app-slug',
 * 	initOptions: {
 * 		dom: {
 * 			inputSanitizer: true,
 * 		},
 * 	},
 * });
 * ```
 */
export const logRocket = function logRocket(options: LogRocketOptions): Script {
	const appId = readId(options?.appId);
	if (appId === undefined) {
		return skipMissingId('logRocket', 'appId', skippedLogRocketScript);
	}
	if (!isLogRocketAppId(appId)) {
		return skipScript(
			"logRocket: invalid appId - must be in 'org/app' format",
			skippedLogRocketScript
		);
	}
	const asyncScriptUrl = trimToUndefined(options.asyncScriptUrl);

	let manifest: VendorManifest = logRocketManifest;
	if (asyncScriptUrl) {
		// Proxy setups chain-load the logger bundle from _lrAsyncScript; seed it
		// before the main SDK executes.
		manifest = {
			...logRocketManifest,
			bootstrap: [
				{
					ifUndefined: false,
					name: '_lrAsyncScript',
					type: 'setGlobal',
					value: '{{asyncScriptUrl}}',
				},
			],
		} satisfies VendorManifest;
	}

	return resolveManifest(manifest, {
		appId,
		asyncScriptUrl,
		initOptions: options.initOptions ?? {},
		scriptUrl: resolveScriptUrl(
			trimToUndefined(options.scriptUrl),
			DEFAULT_LOGROCKET_SCRIPT_URL
		),
	});
};
