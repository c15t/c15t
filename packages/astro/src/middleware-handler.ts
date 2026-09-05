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
 * `true` when `pathname` is `prefix` or lives underneath it.
 *
 * Segment-aware on purpose: `/api` must not claim `/apidocs`.
 */
const matchesPrefix = function matchesPrefix(
	pathname: string,
	prefix: string
): boolean {
	if (!prefix) {
		return false;
	}
	const normalized = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
	return pathname === normalized || pathname.startsWith(`${normalized}/`);
};

/**
 * The paths this middleware leaves alone.
 *
 * The injected init and manifest routes are always in the list. With the
 * manifest served by the same process, letting them through would make the
 * manifest request resolve consent, which fetches the manifest, which
 * resolves consent — a request that never returns. Nothing on those routes
 * renders consent UI, so there is nothing to lose by skipping them.
 *
 * @param options - The resolved integration options.
 * @returns Path prefixes to skip.
 */
const resolveSkipPaths = function resolveSkipPaths(
	options: C15tResolvedOptions
): string[] {
	return [
		options.endpoints.initPath,
		options.endpoints.manifestPath,
		...(options.middleware?.skip ?? []),
	].filter(Boolean);
};

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
 * So are the integration's own init and manifest routes, and anything
 * listed in `middleware.skip` — those run `next()` with `Astro.locals.c15t`
 * left unset.
 *
 * @param options - The resolved integration options.
 * @param middlewareOptions - Test seams.
 * @returns An Astro middleware handler.
 */
export const createConsentMiddleware = function createConsentMiddleware(
	options: C15tResolvedOptions,
	middlewareOptions: ConsentMiddlewareOptions = {}
): MiddlewareHandler {
	const skipPaths = resolveSkipPaths(options);

	return async (context, next) => {
		const { pathname } = new URL(context.request.url);
		if (skipPaths.some((prefix) => matchesPrefix(pathname, prefix))) {
			return await next();
		}

		context.locals.c15t = await resolveConsentContext({
			fetch: middlewareOptions.fetch,
			headers: context.request.headers,
			options,
			skipPrefetch: context.isPrerendered === true,
			url: context.request.url,
		});
		return await next();
	};
};
