/**
 * `defineConsentConfig` — the app's consent setup, declared once in
 * `c15t.config.ts` at the project root.
 *
 * `withConsentManifest` finds that file and hands it to `ConsentRoot`,
 * `resolveConsent`, `createConsentRoute` and the Pages Router helpers, so
 * the app never imports its own config. The module has no `next` or React
 * runtime imports, so the same config is safe on the server and in the
 * browser.
 */

import type { ConsentJourneyOption } from '@c15t/core';
import type { ConsentMode } from '@c15t/core/modes';

import type { ConsentClientOptions } from './types';

/**
 * Next.js replaces this exact expression with the variable's build-time
 * value in server and browser bundles, so it must stay written out in full.
 * Outside Next.js there may be no `process` at all.
 */
declare const process: { env: Record<string, string | undefined> };

/** Environment variable `backendURL` defaults to. */
export const BACKEND_URL_ENV = 'NEXT_PUBLIC_C15T_BACKEND_URL';

/**
 * `NEXT_PUBLIC_C15T_BACKEND_URL`, or `undefined` when it is unset or the
 * runtime has no `process`.
 *
 * @internal
 */
export const readBackendURLFromEnv = function readBackendURLFromEnv():
	| string
	| undefined {
	try {
		return process.env.NEXT_PUBLIC_C15T_BACKEND_URL || undefined;
	} catch {
		return undefined;
	}
};

/**
 * The consent setup of a Next.js app: where the backend is, how the
 * visitor's policy is resolved, and the browser options `ConsentRoot`
 * reads.
 *
 * `c15t.config.ts` is bundled into the browser as well as the server, so
 * it must hold no secrets. Read server-only values (an API token for
 * `forwardHeaders`, say) in server code instead.
 */
export interface ConsentConfig extends ConsentClientOptions {
	/**
	 * Backend base URL. Consent saves (`/subjects`) go here, and the server
	 * reads `/manifest` or `/init` from it.
	 *
	 * @default process.env.NEXT_PUBLIC_C15T_BACKEND_URL
	 */
	backendURL?: string;

	/**
	 * How the visitor's policy is resolved: `manifest()`, `hosted()` or
	 * `offline()` from `c15t/next`. They are plain data, so the browser only
	 * loads the code of the mode it runs.
	 *
	 * @default manifest()
	 */
	mode?: ConsentMode;

	/**
	 * Where the app's catch-all consent route from `createConsentRoute` or
	 * `createPagesConsentRoute` is mounted, such as `/api/c15t` for
	 * `pages/api/c15t/[...c15t].ts`. With it, a browser that resolves
	 * consent itself asks `${routePrefix}/init`, which resolves the cached
	 * manifest with the request's geo, instead of the backend's `/init`.
	 * The server never fetches its own route.
	 *
	 * No default: without it there is no route to serve. Leave it unset
	 * when every page resolves consent on the server.
	 */
	routePrefix?: string;

	/**
	 * The consent journey scope, read by both `resolveConsent` and
	 * `ConsentRoot` so they agree.
	 */
	journey?: ConsentJourneyOption;
}

/**
 * Accepts `/`-relative paths (`/api/consent`) and absolute `http(s)` URLs.
 * Protocol-relative `//host` and bare `api/consent` are rejected: the
 * server helpers resolve relative values against the request host, and
 * both would resolve somewhere the author did not intend.
 */
const isConsentURL = function isConsentURL(value: string): boolean {
	if (value.startsWith('/')) {
		return !value.startsWith('//');
	}
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
};

const assertConsentURL = function assertConsentURL(
	field: string,
	value: unknown
): void {
	if (value === undefined) {
		return;
	}
	if (typeof value !== 'string' || !isConsentURL(value)) {
		throw new TypeError(
			`@c15t/nextjs: defineConsentConfig \`${field}\` must be an absolute http(s) URL or a \`/\`-relative path, received ${JSON.stringify(value)}.`
		);
	}
};

const MODE_TYPES = new Set(['manifest', 'hosted', 'offline']);

/**
 * Whether a mode can run without the config's backend URL: offline mode,
 * or hosted mode with its own.
 */
const modeHasBackend = function modeHasBackend(mode: ConsentMode): boolean {
	return (
		mode.type === 'offline' ||
		(mode.type === 'hosted' && mode.backendURL !== undefined)
	);
};

/**
 * Declare the app's consent setup in `c15t.config.ts` at the project root.
 * `withConsentManifest` in `next.config.ts` finds the file, so
 * `ConsentRoot`, `resolveConsent()`, `createConsentRoute()` and the Pages
 * Router helpers read it without the app importing it.
 *
 * The file is bundled into the browser too, so it can hold functions (such
 * as `scripts`) but must hold no secrets.
 *
 * @param config - Backend URL (defaults to `NEXT_PUBLIC_C15T_BACKEND_URL`),
 * mode, route prefix, journey and the browser options.
 * @returns The validated, frozen config.
 * @throws {TypeError} When the mode needs a backend URL and none is set, a
 * URL is neither an absolute `http(s)` URL nor a `/`-relative path, or
 * `mode` or `journey` is not one this package knows.
 * @example
 * ```ts
 * // c15t.config.ts
 * import { posthog } from '@c15t/integrations/posthog';
 * import { defineConsentConfig } from 'c15t/next';
 *
 * export default defineConsentConfig({
 *   scripts: [posthog({ id: 'phc_your_project_key' })],
 * });
 * ```
 */
export const defineConsentConfig = function defineConsentConfig(
	config: ConsentConfig = {}
): ConsentConfig {
	if (typeof config !== 'object' || config === null) {
		throw new TypeError('@c15t/nextjs: defineConsentConfig expects an object.');
	}
	const mode = config.mode ?? { type: 'manifest' as const };
	if (!MODE_TYPES.has(mode.type)) {
		throw new TypeError(
			'@c15t/nextjs: defineConsentConfig `mode` must be manifest(), hosted() or offline() from c15t/next. Pass a custom transport through ConsentRoot `options.mode`.'
		);
	}
	const backendURL = config.backendURL ?? readBackendURLFromEnv();
	if (backendURL === undefined && !modeHasBackend(mode)) {
		throw new TypeError(
			`@c15t/nextjs: defineConsentConfig needs \`backendURL\`, or ${BACKEND_URL_ENV} set at build time.`
		);
	}
	assertConsentURL('backendURL', backendURL);
	assertConsentURL('routePrefix', config.routePrefix);
	if (mode.type === 'manifest') {
		assertConsentURL('mode.manifestURL', mode.manifestURL);
		assertConsentURL('mode.geoURL', mode.geoURL);
	}
	if (mode.type === 'hosted') {
		assertConsentURL('mode.backendURL', mode.backendURL);
	}
	if (
		config.journey !== undefined &&
		config.journey !== false &&
		config.journey !== 'page' &&
		config.journey !== 'tab'
	) {
		throw new TypeError(
			"@c15t/nextjs: defineConsentConfig `journey` must be 'page', 'tab' or false."
		);
	}

	const defined: ConsentConfig = { ...config };
	if (backendURL !== undefined) {
		defined.backendURL = backendURL;
	}
	if (config.routePrefix !== undefined) {
		defined.routePrefix = config.routePrefix.replace(/\/+$/u, '');
	}
	return Object.freeze(defined);
};
