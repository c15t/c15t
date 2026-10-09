/**
 * SvelteKit `handle` hook that resolves consent context once per request.
 *
 * The Next.js counterpart (`c15tMiddleware`) exists because that platform
 * exposes geo to middleware and strips it before Server Components. SvelteKit
 * has no such gap — but it does have the same duplication problem: without a
 * handle, every `+layout.server.ts`, `+page.server.ts` and route handler
 * re-parses the same headers and the same cookie. This runs that work once and
 * publishes it on `event.locals.c15t`.
 */
import { readRequestConsent } from '@c15t/core/server';
import type { ConsentRequestHeaderInputs } from '@c15t/schema/types';
import type { RequestEvent } from '@sveltejs/kit';

import { injectModulePreloads } from './module-preload';
import { injectSurfaceStyles } from './surface-styles';
import type { C15tLocals, ConsentRequestOptions } from './types';

/** Options for {@link c15tHandle}. */
export interface C15tHandleOptions extends ConsentRequestOptions {
	/**
	 * Every page this handle serves is shared between visitors, as during a
	 * prerender. The handle then reads no cookie or geo header and leaves
	 * no stored consent, clock or privacy signal on `event.locals.c15t`, and
	 * `loadConsent` makes no upstream call. Pass SvelteKit's `building`
	 * flag: from `$app/environment` in SvelteKit 2, `$app/env` in
	 * SvelteKit 3.
	 *
	 * @example
	 * ```ts
	 * import { building } from '$app/environment';
	 *
	 * export const handle = c15tHandle({ shared: building });
	 * ```
	 */
	shared?: boolean;
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
 * Augment `App.Locals` so `event.locals.c15t` is typed:
 *
 * ```ts
 * import type { C15tLocals } from '@c15t/svelte/kit';
 *
 * declare global {
 *   namespace App {
 *     interface Locals {
 *       c15t: C15tLocals;
 *     }
 *   }
 * }
 * ```
 *
 * @param options - Cookie name and geo/language overrides.
 * @returns A `handle` hook that populates `event.locals.c15t`.
 */
export const c15tHandle = function c15tHandle(
	options: C15tHandleOptions = {}
): C15tHandle {
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
			shared: options.shared === true,
			storage: options.cookieName
				? { storageKey: options.cookieName }
				: undefined,
		});
		if (!options.shared) {
			normalizeRequestHeaders(headers, inputs);
		}

		const locals: C15tLocals = { config, inputs };
		if (options.cookieName !== undefined) {
			locals.cookieName = options.cookieName;
		}
		if (options.shared) {
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
