/**
 * SvelteKit `handle` hook that holds the consent config and reads the
 * request's consent context once.
 *
 * Without a handle, every `+layout.server.ts`, `+page.server.ts` and route
 * handler would re-parse the same headers and the same cookie. This runs
 * that work once and publishes it, with the mode `loadConsent` resolves
 * with, on `event.locals.c15t`.
 */
import { building } from '$app/env';
import type { ConsentMode } from '@c15t/core/modes';
import { normalizeRoutePrefix, readRequestConsent } from '@c15t/core/server';
import type {
	ConsentManifest,
	ConsentRequestHeaderInputs,
} from '@c15t/schema/types';
import type { RequestEvent } from '@sveltejs/kit';

import { injectModulePreloads } from './module-preload';
import { injectSurfaceStyles } from './surface-styles';
import type { C15tLocals, ConsentRequestOptions } from './types';

/** Options for {@link c15tHandle}. */
export interface C15tHandleOptions extends ConsentRequestOptions {
	/**
	 * The c15t backend. Defaults to the URL `consentManifest()` read from
	 * `PUBLIC_C15T_BACKEND_URL` or `PUBLIC_INTH_PROJECT_URL`. A
	 * `hosted({ backendURL })` mode's own URL wins.
	 */
	backendURL?: string;
	/**
	 * How `loadConsent` resolves the visitor: `manifest()` (the default),
	 * `hosted()` or `offline()` from `@c15t/svelte/kit`. They are plain
	 * data; `ConsentRoot` loads the code a mode needs in the browser only
	 * when it runs.
	 *
	 * @default manifest()
	 */
	mode?: ConsentMode;
	/**
	 * Where `createConsentRoute()` is mounted, such as `/api/c15t` for
	 * `src/routes/api/c15t/[...path]/+server.ts`. The browser then resolves
	 * consent on pages the server did not, such as prerendered ones,
	 * through the app's own route. Without it, the browser asks the
	 * backend's `/init`. `/` is rejected: a catch-all route at the site
	 * root would catch every page.
	 */
	routePrefix?: string;
	/**
	 * A manifest to resolve with instead of the one `consentManifest()`
	 * downloaded.
	 */
	snapshot?: ConsentManifest;
}

/**
 * The `handle` hook signature, assignable to SvelteKit's `Handle` in both
 * Kit 2 and Kit 3.
 *
 * Declared here because the two versions export `Handle` from different
 * modules: Kit 2 from `@sveltejs/kit`, Kit 3 only from `@sveltejs/kit/hooks`.
 * Importing either one leaves the other version's apps with an unresolved
 * type, which `skipLibCheck` turns into a silent `any`.
 */
export type C15tHandle = (input: {
	event: RequestEvent;
	resolve: (
		event: RequestEvent,
		options?: {
			transformPageChunk?: (input: {
				done: boolean;
				html: string;
			}) => string | undefined;
		}
	) => Response | Promise<Response>;
}) => Promise<Response>;

/**
 * Rewrites the resolved inputs back onto the request as the canonical
 * `x-c15t-*` / `sec-gpc` headers, so anything downstream that reads raw
 * headers (a proxied backend call, a nested handle) sees one normalized
 * shape instead of whichever CDN header happened to carry it.
 *
 * Request headers are immutable in some runtimes. When the write is refused
 * the normalized values are still on `event.locals.c15t.inputs`, which is
 * what every helper in this package reads, so the request continues.
 */
const normalizeRequestHeaders = function normalizeRequestHeaders(
	headers: Headers,
	inputs: ConsentRequestHeaderInputs
): void {
	try {
		if (inputs.country) {
			headers.set('x-c15t-country', inputs.country);
		}
		if (inputs.region) {
			headers.set('x-c15t-region', inputs.region);
		}
		if (inputs.language) {
			// The resolved language, not the browser's list: a downstream
			// route re-reads `accept-language`, and an `options.language`
			// override has to reach it too.
			headers.set('accept-language', inputs.language);
		}
		if (inputs.gpc !== undefined) {
			headers.set('sec-gpc', inputs.gpc ? '1' : '0');
		}
	} catch {
		// Immutable headers — locals still carry the normalized inputs.
	}
};

/**
 * The data a mode carries. A transport factory, such as `hosted()` from
 * `@c15t/svelte`, carries its options as data too; only that data reaches
 * the browser.
 */
const modeData = function modeData(mode: ConsentMode): ConsentMode {
	if (typeof mode !== 'function') {
		return mode;
	}
	if (!(mode as Partial<ConsentMode>).type) {
		throw new TypeError(
			'c15t: c15tHandle() takes manifest(), hosted() or offline() from @c15t/svelte/kit. Pass custom() to <ConsentRoot mode> instead.'
		);
	}
	const { kind: _kind, ...data } = mode as ConsentMode & { kind?: string };
	return data as ConsentMode;
};

/**
 * Creates the c15t SvelteKit handle.
 *
 * Register it in `src/hooks.server.ts`, alone or composed with `sequence()`:
 *
 * ```ts
 * import { c15tHandle } from '@c15t/svelte/kit';
 * import { sequence } from '@sveltejs/kit/hooks';
 *
 * export const handle = sequence(c15tHandle(), myOtherHandle);
 * ```
 *
 * Type `event.locals.c15t` with one line in `src/app.d.ts`:
 *
 * ```ts
 * /// <reference types="@c15t/svelte/kit/locals" />
 * ```
 *
 * While SvelteKit prerenders, every page is shared between visitors: the
 * handle reads no cookie or geo header and leaves no stored consent, clock
 * or privacy signal on `event.locals.c15t`.
 *
 * @param options - The mode, the consent route's prefix, a snapshot, the
 * cookie name and geo/language overrides.
 * @returns A `handle` hook that populates `event.locals.c15t`.
 * @throws {TypeError} When `mode` is `custom()`, which cannot reach the
 * browser as data, or `routePrefix` is `/` or not a path.
 */
export const c15tHandle = function c15tHandle(
	options: C15tHandleOptions = {}
): C15tHandle {
	const mode = modeData(options.mode ?? { type: 'manifest' });
	const routePrefix =
		options.routePrefix === undefined
			? undefined
			: normalizeRoutePrefix('@c15t/svelte', options.routePrefix);
	return async ({ event, resolve }) => {
		const { headers } = event.request;
		// A prerendered page is one HTML file for every visitor: no cookie or
		// geo header of whoever triggered the build belongs in it.
		const { inputs, state: config } = readRequestConsent({
			adapter: '@c15t/svelte',
			overrides: {
				country: options.country,
				language: options.language,
				region: options.region,
			},
			request: { headers, url: event.url },
			shared: building,
			storage: options.cookieName
				? { storageKey: options.cookieName }
				: undefined,
		});
		if (!building) {
			normalizeRequestHeaders(headers, inputs);
		}

		const locals: C15tLocals = { config, inputs, mode };
		if (options.backendURL !== undefined) {
			locals.backendURL = options.backendURL;
		}
		if (routePrefix !== undefined) {
			locals.routePrefix = routePrefix;
		}
		if (options.snapshot !== undefined) {
			locals.snapshot = options.snapshot;
		}
		if (options.cookieName !== undefined) {
			locals.cookieName = options.cookieName;
		}
		if (building) {
			locals.shared = true;
		}
		(event.locals as { c15t?: C15tLocals }).c15t = locals;

		// A page whose provider configures scripts or blocker rules names
		// their on-demand chunks in its head; link them so the browser
		// fetches them with the app's code. A server-rendered banner names
		// its stylesheets the same way; they go into the HTML, so no
		// stylesheet request holds back the first paint. Prerendered pages
		// too: both are the same for every visitor.
		return await resolve(event, {
			transformPageChunk: ({ html }) =>
				injectModulePreloads(injectSurfaceStyles(html)),
		});
	};
};
