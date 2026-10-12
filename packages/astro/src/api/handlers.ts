/**
 * Route handlers for `${routePrefix}/init` and `${routePrefix}/manifest`.
 *
 * The routes themselves live in `@c15t/core/server`
 * (`createConsentRouteHandler`), shared with the Next.js, Nuxt, SvelteKit
 * and TanStack Start adapters. This module mounts them for Astro: it maps
 * the integration's resolved options onto the handler, applies the
 * configured locale, and registers detached work with the adapter's
 * `waitUntil` from `locals`.
 */

import { createConsentRouteHandler, readWaitUntil } from '@c15t/core/server';
import type { ManifestFetch } from '@c15t/core/server';
import { extractConsentRequestInputs } from '@c15t/schema/types';

import type { C15tResolvedOptions } from '../types';
import { resolveManifestSourceFrom } from './manifest-init';
import type { FetchGvl } from './manifest-init';

/**
 * The per-request context a route or the middleware can pass so a
 * background refresh is registered with the platform. Astro adapters that
 * cancel detached work after the response expose `waitUntil` on it
 * (Cloudflare); anything else is left alone.
 */
export interface RequestLifetime {
	locals?: unknown;
}

interface AdapterLocals {
	cfContext?: unknown;
	runtime?: { ctx?: unknown };
}

/**
 * Hands a promise to the `waitUntil` an Astro adapter exposes, so a
 * background refresh outlives the response on runtimes that would cancel
 * it. The Cloudflare adapter puts the execution context on
 * `locals.cfContext` from Astro 6, and on `locals.runtime.ctx` before that.
 * A no-op where there is neither.
 */
export const waitUntilFromLocals = function waitUntilFromLocals(
	revalidation: Promise<void>,
	locals: unknown
): void {
	const adapterLocals = locals as AdapterLocals | undefined;
	// `cfContext` first: the Astro 6 adapter keeps a `runtime.ctx` getter that
	// throws, so it is only read when there is no `cfContext`.
	const waitUntil =
		readWaitUntil(adapterLocals?.cfContext) ??
		readWaitUntil(adapterLocals?.runtime?.ctx);
	waitUntil?.(revalidation);
};

/** Options accepted by the route handler factory. */
export interface ConsentRouteHandlerOptions {
	/** The resolved integration options. */
	options: C15tResolvedOptions;
	/** Override fetch, mainly for tests. */
	fetch?: ManifestFetch;
	/**
	 * Fetches the Global Vendor List when the resolved policy is IAB.
	 * Defaults to the shared server cache, with a deadline on the upstream
	 * request.
	 */
	fetchGvl?: FetchGvl;
	/**
	 * Receives the promise of detached work started by this request (a
	 * background manifest revalidation, a session report), so the host can
	 * keep it alive past the response on runtimes that stop detached work
	 * once a response is sent (a platform `waitUntil`, for example). The
	 * promise never rejects. Defaults to the adapter's `waitUntil` on
	 * `locals` when the route passes them.
	 */
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;
}

/**
 * Work out where `GET /manifest` lives for this request.
 *
 * `manifestURL` when set, otherwise `${backendURL}/manifest`.
 *
 * @param request - The incoming request, used to resolve relative URLs.
 * @param options - The resolved integration options.
 * @returns An absolute manifest URL.
 * @throws {Error} When neither a manifest URL nor a backend URL is configured.
 */
export const resolveManifestSourceURL = function resolveManifestSourceURL(
	request: Request,
	options: C15tResolvedOptions
): string {
	return resolveManifestSourceFrom(
		{ headers: request.headers, url: request.url },
		options
	);
};

/**
 * Build the `init` and `manifest` route handlers, the ones behind the
 * injected route.
 *
 * With `routePrefix: false` the browser never calls a route you build from
 * these: a page the server resolved inits again through the backend's
 * `/init`. Mount them for other clients, or let browser resolution fetch
 * the manifest from them with
 * `manifest({ resolve: 'browser', manifestURL: '/api/c15t/manifest' })`.
 * To have the browser use the route for `/init`, keep the injected route
 * and change its path with `routePrefix`.
 *
 * @param handlerOptions - Integration options plus test seams.
 * @returns `init`, `manifest`, and a `GET` that dispatches between them by
 * the last path segment.
 * @example
 * ```ts
 * // src/pages/api/c15t/[...path].ts, with routePrefix: false and
 * // mode: manifest({ resolve: 'browser', manifestURL: '/api/c15t/manifest' })
 * import options from 'virtual:c15t/options';
 * import { createConsentRouteHandlers } from 'c15t/astro/server';
 *
 * const handlers = createConsentRouteHandlers({ options });
 * export const GET = ({ locals, request }) => handlers.GET(request, { locals });
 * ```
 */
export const createConsentRouteHandlers = function createConsentRouteHandlers(
	handlerOptions: ConsentRouteHandlerOptions
) {
	const { mode, i18n } = handlerOptions.options;
	const handle = createConsentRouteHandler({
		adapter: '@c15t/astro',
		backendURL:
			(mode.type === 'hosted' ? mode.backendURL : undefined) ??
			handlerOptions.options.backendURL,
		fetch: handlerOptions.fetch,
		fetchGvl: handlerOptions.fetchGvl,
		manifest: mode.type === 'manifest' ? mode.snapshot : undefined,
		manifestURL: mode.type === 'manifest' ? mode.manifestURL : undefined,
		// Hosted mode counts its visitors through the backend's own `/init`.
		reportSessions:
			mode.type === 'manifest' &&
			handlerOptions.options.reportSessions !== false,
	});
	const locale = i18n?.locale;

	const waitUntilFor = function waitUntilFor(
		lifetime: RequestLifetime | undefined
	): ((task: Promise<void>) => void) | undefined {
		if (handlerOptions.onBackgroundRevalidate) {
			return handlerOptions.onBackgroundRevalidate;
		}
		return lifetime
			? (task) => waitUntilFromLocals(task, lifetime.locals)
			: undefined;
	};

	/**
	 * `GET ${routePrefix}/init` — a resolved `InitOutput`, never cached.
	 *
	 * @param request - The incoming request.
	 * @param lifetime - The route's `{ locals }`, so detached work can be
	 * registered with the adapter's `waitUntil`.
	 */
	const init = function init(
		request: Request,
		lifetime?: RequestLifetime
	): Promise<Response> {
		return handle(request, {
			// The same override the SSR path applies, so both resolve one
			// language, and one set of vendor-list translations.
			inputs: locale
				? extractConsentRequestInputs(request.headers, { language: locale })
				: undefined,
			route: 'init',
			waitUntil: waitUntilFor(lifetime),
		});
	};

	/**
	 * `GET ${routePrefix}/manifest` — the manifest, with its own cache headers.
	 *
	 * @param request - The incoming request.
	 * @param lifetime - The route's `{ locals }`, so a background manifest
	 * refresh can be registered with the adapter's `waitUntil`.
	 */
	const manifest = function manifest(
		request: Request,
		lifetime?: RequestLifetime
	): Promise<Response> {
		return handle(request, {
			route: 'manifest',
			waitUntil: waitUntilFor(lifetime),
		});
	};

	/**
	 * The catch-all route: `init` or `manifest` by the last path segment,
	 * and 404 for anything else under the prefix.
	 *
	 * @param request - The incoming request.
	 * @param lifetime - The route's `{ locals }`.
	 */
	const GET = function GET(
		request: Request,
		lifetime?: RequestLifetime
	): Promise<Response> {
		const route = /\/(?<route>init|manifest)\/?$/u.exec(
			new URL(request.url).pathname
		)?.groups?.route;
		if (route === 'manifest') {
			return manifest(request, lifetime);
		}
		if (route === 'init') {
			return init(request, lifetime);
		}
		return Promise.resolve(new Response(null, { status: 404 }));
	};

	return { GET, init, manifest };
};
