/**
 * Route handlers for `/api/c15t/init` and `/api/c15t/manifest`.
 *
 * Manifest mode moves policy resolution off the browser's critical path:
 * the host fetches one geo-independent, CDN-cacheable manifest and resolves
 * `/init` locally per request. These are the Astro handlers for that — the
 * same contract `createSvelteKitConsentRouteHandlers` and
 * `createNextConsentRouteHandlers` implement.
 *
 * Cache discipline:
 * - The manifest route forwards the backend's `Cache-Control`/`ETag`
 *   verbatim and answers `If-None-Match` with `304`. The edge caches it;
 *   this process only dedupes bursts (see `@c15t/core/server`).
 * - The init route is per-request (geo, language, GPC) and therefore
 *   `private, no-store`.
 */

import {
	fetchCachedManifest,
	MANIFEST_PASSTHROUGH_HEADERS,
} from '@c15t/core/server';
import type { ManifestFetch } from '@c15t/core/server';
import { extractConsentRequestInputs } from '@c15t/schema/types';

import type { C15tResolvedOptions } from '../types';
import {
	loadConsentManifest,
	resolveManifestInit,
	resolveManifestSourceFrom,
} from './manifest-init';
import type { FetchGvl } from './manifest-init';

const INIT_CACHE_CONTROL = 'private, no-store';
const MANIFEST_ROUTE_SUFFIX = '/manifest';

/** Options accepted by the route handler factory. */
export interface ConsentRouteHandlerOptions {
	/** The resolved integration options. */
	options: C15tResolvedOptions;
	/** Override fetch, mainly for tests. */
	fetch?: ManifestFetch;
	/**
	 * Fetches the Global Vendor List when the resolved policy is IAB.
	 * Defaults to a plain `GET` of the manifest's GVL reference.
	 */
	fetchGvl?: FetchGvl;
}

/**
 * Work out where `GET /manifest` lives for this request.
 *
 * Explicit options win, then `C15T_MANIFEST_URL` / `C15T_BACKEND_URL`.
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
 * Build the `init` and `manifest` route handlers.
 *
 * @param handlerOptions - Integration options plus test seams.
 * @returns `init`, `manifest`, and a `GET` that dispatches between them.
 * @example
 * ```ts
 * // src/pages/api/c15t/init.ts
 * import options from 'virtual:c15t/options';
 * import { createConsentRouteHandlers } from '@c15t/astro/api';
 *
 * const handlers = createConsentRouteHandlers({ options });
 * export const GET = ({ request }) => handlers.init(request);
 * ```
 */
export const createConsentRouteHandlers = function createConsentRouteHandlers(
	handlerOptions: ConsentRouteHandlerOptions
) {
	/** `GET /api/c15t/init` — a resolved `InitOutput`, never cached. */
	const init = async function init(request: Request): Promise<Response> {
		const manifest = await loadConsentManifest({
			fetch: handlerOptions.fetch,
			options: handlerOptions.options,
			source: { headers: request.headers, url: request.url },
		});
		const payload = await resolveManifestInit({
			fetch: handlerOptions.fetch,
			fetchGvl: handlerOptions.fetchGvl,
			inputs: extractConsentRequestInputs(request.headers),
			manifest,
		});

		return Response.json(payload, {
			headers: { 'cache-control': INIT_CACHE_CONTROL },
		});
	};

	/** `GET /api/c15t/manifest` — the manifest, with its own cache headers. */
	const manifest = async function manifest(
		request: Request
	): Promise<Response> {
		const manifestURL = resolveManifestSourceURL(
			request,
			handlerOptions.options
		);
		const query = new URL(request.url).searchParams.toString();
		const result = await fetchCachedManifest({
			config: { manifestURL },
			fetch: handlerOptions.fetch,
			query,
		});

		const headers = new Headers({ 'content-type': 'application/json' });
		for (const name of MANIFEST_PASSTHROUGH_HEADERS) {
			const value = result.headers[name];
			if (value) {
				headers.set(name, value);
			}
		}

		const { etag } = result.headers;
		if (etag && request.headers.get('if-none-match') === etag) {
			return new Response(null, { headers, status: 304 });
		}

		return new Response(JSON.stringify(result.manifest), {
			headers,
			status: 200,
		});
	};

	const GET = function GET(request: Request): Promise<Response> {
		return new URL(request.url).pathname.endsWith(MANIFEST_ROUTE_SUFFIX)
			? manifest(request)
			: init(request);
	};

	return { GET, init, manifest };
};
