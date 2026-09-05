/**
 * The middleware factory behind `@c15t/astro/middleware`.
 *
 * Kept separate from the entrypoint so it can be constructed with explicit
 * options — the entrypoint binds it to the build-time virtual module, and
 * tests and advanced setups bind it to their own.
 */

import type { MiddlewareHandler } from 'astro';

import { resolveConsentContext } from './server';
import type { C15tResolvedOptions } from './types';

/** Options for {@link createConsentMiddleware}. */
export interface ConsentMiddlewareOptions {
	/** Override fetch, mainly for tests. */
	fetch?: typeof globalThis.fetch;
}

/**
 * Build the `pre`-order middleware that populates `Astro.locals.c15t`.
 *
 * It reads the consent cookie and the geo/GPC headers, resolves the policy
 * decision through the configured mode, and leaves the result on locals so
 * the components render the right thing on the server and the browser boots
 * without an `/init` roundtrip.
 *
 * A prerendered route is skipped: there is no per-visitor request to read,
 * and resolving one would bake one visitor's geo into a shared HTML file.
 * Use `<ConsentBannerDeferred />` when a cached page still needs live geo.
 *
 * @param options - The resolved integration options.
 * @param middlewareOptions - Test seams.
 * @returns An Astro middleware handler.
 */
export const createConsentMiddleware = function createConsentMiddleware(
	options: C15tResolvedOptions,
	middlewareOptions: ConsentMiddlewareOptions = {}
): MiddlewareHandler {
	return async (context, next) => {
		context.locals.c15t = await resolveConsentContext({
			fetch: middlewareOptions.fetch,
			headers: context.request.headers,
			options,
			skipPrefetch: context.isPrerendered === true,
		});
		return await next();
	};
};
