import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
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

function validateLogRocketAppId(appId: unknown): string {
	const normalized = typeof appId === 'string' ? appId.trim() : '';

	if (
		normalized.length === 0 ||
		!normalized.includes('/') ||
		normalized.startsWith('/') ||
		normalized.endsWith('/')
	) {
		throw new Error(
			"logRocket: invalid appId - must be a non-empty string in 'org/app' format"
		);
	}

	return normalized;
}

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
	vendor: 'logrocket',
	category: 'measurement',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			attributes: {
				crossorigin: 'anonymous',
			},
		},
	],
	afterLoad: [
		{
			type: 'callGlobal',
			global: 'LogRocket',
			method: 'init',
			args: ['{{appId}}', '{{initOptions}}'],
		},
	],
} as const satisfies VendorManifest;

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
}

/**
 * Creates a LogRocket script.
 *
 * @see https://docs.logrocket.com/reference/init
 *
 * @param options - The options for the LogRocket script.
 * @returns The LogRocket script.
 * @throws {Error} When `appId` is missing, empty, or not in `org/app` format.
 * Provide the app ID from LogRocket Project Setup to prevent this error.
 *
 * @remarks
 * LogRocket records session replay and monitoring data. Configure LogRocket's
 * privacy and sanitization options before deployment so sensitive DOM, input,
 * network, or application state data is excluded from recordings.
 *
 * @example
 * ```ts
 * import { logRocket } from '@c15t/scripts/logrocket';
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
export function logRocket(options: LogRocketOptions): Script {
	const appId = validateLogRocketAppId(options?.appId);

	return resolveManifest(logRocketManifest, {
		appId,
		initOptions: options.initOptions ?? {},
		scriptUrl: resolveScriptUrl(
			trimToUndefined(options.scriptUrl),
			DEFAULT_LOGROCKET_SCRIPT_URL
		),
	});
}
