/**
 * SvelteKit `Handle` that resolves consent context once per request.
 *
 * The Next.js counterpart (`c15tMiddleware`) exists because that platform
 * exposes geo to middleware and strips it before Server Components. SvelteKit
 * has no such gap — but it does have the same duplication problem: without a
 * handle, every `+layout.server.ts`, `+page.server.ts` and route handler
 * re-parses the same headers and the same cookie. This runs that work once and
 * publishes it on `event.locals.c15t`.
 */
import type { KernelConfig } from '@c15t/core';
import { extractConsentRequestInputs } from '@c15t/schema/types';
import type { Handle } from '@sveltejs/kit';

import { readInitialConsentConfig } from '../server';
import type { C15tLocals, ConsentRequestOptions } from './types';

/** Options for {@link c15tHandle}. */
export type C15tHandleOptions = ConsentRequestOptions;

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
	inputs: ReturnType<typeof extractConsentRequestInputs>
): void {
	try {
		if (inputs.country) {
			headers.set('x-c15t-country', inputs.country);
		}
		if (inputs.region) {
			headers.set('x-c15t-region', inputs.region);
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
 * @returns A `Handle` that populates `event.locals.c15t`.
 */
export const c15tHandle = function c15tHandle(
	options: C15tHandleOptions = {}
): Handle {
	return async ({ event, resolve }) => {
		const { headers } = event.request;
		const inputs = extractConsentRequestInputs(headers, {
			country: options.country,
			language: options.language,
			region: options.region,
		});
		normalizeRequestHeaders(headers, inputs);

		const config: KernelConfig = await readInitialConsentConfig({
			cookieName: options.cookieName,
			country: inputs.country,
			headers,
			language: inputs.language,
			region: inputs.region,
		});

		const locals: C15tLocals = { config, inputs };
		(event.locals as { c15t?: C15tLocals }).c15t = locals;

		return resolve(event);
	};
};
