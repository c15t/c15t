/**
 * Astro middleware for `@c15t/astro`.
 *
 * Registered with `order: 'pre'` by the integration so every route — pages,
 * endpoints and server islands alike — sees `Astro.locals.c15t` already
 * populated. It reads the consent cookie and the geo/GPC headers, resolves
 * the policy decision through the configured mode, and hands the result to
 * the components; the browser then boots from the inlined config instead of
 * paying an `/init` roundtrip per page.
 *
 * Works for `output: 'server'` and `output: 'static'` with on-demand routes.
 * For a fully prerendered page there is no request to read, so the middleware
 * degrades to the cookie-free baseline and the browser resolves consent
 * itself — use `<ConsentBannerDeferred />` when a cached page still needs
 * per-request geo.
 */

import type { MiddlewareHandler } from 'astro';
import options from 'virtual:c15t/options';

import { resolveConsentContext } from './server';
import type { C15tLocals } from './types';

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace -- Astro's documented locals augmentation point.
	namespace App {
		interface Locals {
			/** Consent context resolved by the c15t middleware. */
			c15t: C15tLocals;
		}
	}
}

/**
 * The middleware entrypoint the integration registers.
 *
 * @param context - The Astro middleware context.
 * @param next - The downstream handler.
 * @returns The downstream response.
 */
export const onRequest: MiddlewareHandler = async function onRequest(
	context,
	next
) {
	// A prerendered route has no live request context worth resolving, and
	// resolving one would bake one visitor's geo into a shared HTML file.
	const isPrerendered = context.isPrerendered === true;

	context.locals.c15t = await resolveConsentContext({
		headers: context.request.headers,
		options,
		skipPrefetch: isPrerendered,
	});

	return next();
};

export default onRequest;
