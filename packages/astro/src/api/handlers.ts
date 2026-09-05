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
import type {
	ConsentManifest,
	ConsentManifestGVLReference,
	GlobalVendorList,
	InitOutput,
} from '@c15t/schema/types';
import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
	resolveBackendURL,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import type { C15tResolvedOptions } from '../types';

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
	fetchGvl?: (input: {
		reference: ConsentManifestGVLReference;
		language: string;
		fetch: ManifestFetch;
	}) => Promise<GlobalVendorList | null>;
}

/**
 * How long to wait for the Global Vendor List before giving up on it. The
 * list is a nice-to-have on this route; the response is not.
 */
const GVL_FETCH_TIMEOUT_MS = 5000;

const getEnv = function getEnv(name: string): string | undefined {
	if (typeof process === 'undefined') {
		return undefined;
	}
	return (process.env as Record<string, string | undefined> | undefined)?.[
		name
	];
};

const trimSlash = function trimSlash(value: string): string {
	return value.endsWith('/') ? value.slice(0, -1) : value;
};

/**
 * Resolves a possibly-relative backend URL against the request.
 *
 * `Request.url` is the only source. The adapter builds it from whatever
 * proxy configuration the deployment declared, so seeding from it both fixes
 * a relative `backendURL` on a plain `http://localhost` dev server and keeps
 * a forged `x-forwarded-host` from steering this server-side fetch at a host
 * of the caller's choosing.
 */
const resolveAgainstRequest = function resolveAgainstRequest(
	url: string,
	request: Request
): string | null {
	const requestURL = new URL(request.url);
	return resolveBackendURL(url, {
		host: requestURL.host,
		'x-forwarded-proto': requestURL.protocol.replace(':', ''),
	});
};

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
	const { mode } = options;
	const manifestURL =
		(mode.type === 'manifest' ? mode.manifestURL : undefined) ??
		getEnv('C15T_MANIFEST_URL');
	if (manifestURL) {
		const resolved = resolveAgainstRequest(manifestURL, request);
		if (!resolved) {
			throw new Error('@c15t/astro: invalid manifest URL.');
		}
		return resolved;
	}

	const backendURL =
		(mode.type === 'manifest' ? mode.backendURL : undefined) ??
		(mode.type === 'hosted' ? mode.url : undefined) ??
		getEnv('C15T_BACKEND_URL') ??
		getEnv('PUBLIC_C15T_BACKEND_URL');
	if (!backendURL) {
		throw new Error(
			'@c15t/astro: manifest mode requires `backendURL` or `manifestURL` (or the C15T_BACKEND_URL environment variable).'
		);
	}
	const resolved = resolveAgainstRequest(backendURL, request);
	if (!resolved) {
		throw new Error('@c15t/astro: invalid backend URL.');
	}
	return `${trimSlash(resolved)}${MANIFEST_ROUTE_SUFFIX}`;
};

const shouldFetchGvl = function shouldFetchGvl(
	manifest: ConsentManifest,
	payload: InitOutput
): boolean {
	return (
		manifest.iab?.enabled === true &&
		manifest.iab.gvl !== undefined &&
		(manifest.policyPacks === undefined || payload.policy?.model === 'iab')
	);
};

const defaultFetchGvl = async function defaultFetchGvl(input: {
	reference: ConsentManifestGVLReference;
	language: string;
	fetch: ManifestFetch;
}): Promise<GlobalVendorList | null> {
	const response = await input.fetch(input.reference.url, {
		headers: { 'accept-language': input.language },
		method: 'GET',
		signal: AbortSignal.timeout(GVL_FETCH_TIMEOUT_MS),
	});
	if (response.status === 204) {
		return null;
	}
	if (!response.ok) {
		throw new Error(
			`@c15t/astro: GVL responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as GlobalVendorList;
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
	const fetchImpl =
		handlerOptions.fetch ??
		(globalThis.fetch?.bind(globalThis) as ManifestFetch | undefined);

	/** `GET /api/c15t/init` — a resolved `InitOutput`, never cached. */
	const init = async function init(request: Request): Promise<Response> {
		const manifestURL = resolveManifestSourceURL(
			request,
			handlerOptions.options
		);
		const { manifest } = await fetchCachedManifest({
			config: { manifestURL },
			fetch: handlerOptions.fetch,
		});

		// The same override the SSR path applies, so both resolve one
		// language — and one set of GVL translations.
		const inputs = extractConsentRequestInputs(request.headers, {
			language: handlerOptions.options.i18n?.locale,
		});
		const payload = resolveInitFromManifest(
			manifest,
			{
				country: inputs.country,
				gpc: inputs.gpc,
				language: inputs.language ?? 'en',
				region: inputs.region,
			},
			{ baseTranslations }
		) as InitOutput & { resolvedOverrides?: Record<string, unknown> };

		if (shouldFetchGvl(manifest, payload) && manifest.iab?.gvl && fetchImpl) {
			const language = payload.translations.language.split('-')[0] || 'en';
			try {
				payload.gvl = await (handlerOptions.fetchGvl ?? defaultFetchGvl)({
					fetch: fetchImpl,
					language,
					reference: manifest.iab.gvl,
				});
			} catch {
				// `gvl` is nullable by contract, and the SSR path's fallback
				// does not cover this route. A vendor list the client can
				// treat as unavailable beats a 500 on `/init`.
				payload.gvl = null;
			}
		}

		// The resolver's inputs are the only place GPC survives on the SSR
		// path — the browser never sends `Sec-GPC` to this route when the
		// page was server-rendered. Echo them back so the kernel folds the
		// same overrides it would have derived client-side.
		payload.resolvedOverrides = consentInputsToOverrides(inputs);

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
