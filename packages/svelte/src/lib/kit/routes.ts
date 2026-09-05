/**
 * Same-origin consent routes for SvelteKit.
 *
 * Manifest mode (RFC 0001) moves policy resolution off the browser's critical
 * path: the host fetches one geo-independent, CDN-cacheable manifest and
 * resolves `/init` locally per request. These handlers are the SvelteKit
 * server piece — the same contract `createNextConsentRouteHandlers` and the
 * Nuxt route factories implement.
 *
 * Cache discipline:
 * - The manifest route forwards the backend's `Cache-Control`/`ETag`
 *   verbatim and answers `If-None-Match` with `304`. The edge caches it; this
 *   process only dedupes bursts (see `@c15t/core/server`).
 * - The init route is per-request (geo, language, GPC) and therefore
 *   `private, no-store`.
 */
import {
	fetchCachedManifest,
	MANIFEST_PASSTHROUGH_HEADERS,
} from '@c15t/core/server';
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
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

import type { ConsentManifestOptions } from './types';

const INIT_CACHE_CONTROL = 'private, no-store';
const MANIFEST_ROUTE_SUFFIX = '/manifest';

/** Options for {@link createSvelteKitConsentRouteHandlers}. */
export interface SvelteKitConsentRouteOptions extends ConsentManifestOptions {
	/**
	 * Fetches the Global Vendor List when the resolved policy is IAB.
	 * Defaults to a plain `GET` of the manifest's GVL reference.
	 */
	fetchGvl?: (input: {
		reference: ConsentManifestGVLReference;
		language: string;
		fetch: typeof globalThis.fetch;
	}) => Promise<GlobalVendorList | null>;
}

const getEnv = function getEnv(name: string): string | undefined {
	if (typeof process === 'undefined') {
		return undefined;
	}
	// `process.env` is typed narrowly in a Svelte app's TS project; this
	// module also runs in plain Node and edge runtimes.
	return (process.env as Record<string, string | undefined> | undefined)?.[
		name
	];
};

/**
 * Resolves a possibly-relative backend URL against the request.
 *
 * Only `event.url` decides the origin. SvelteKit derives it from the
 * adapter's trusted configuration (`ORIGIN`, or `PROTOCOL_HEADER`/
 * `HOST_HEADER` where a proxy is declared), so seeding from it both fixes a
 * relative URL on a plain `http://localhost` dev server and keeps a forged
 * `x-forwarded-host` from steering this server-side fetch at a host of the
 * caller's choosing.
 */
const resolveAgainstRequest = function resolveAgainstRequest(
	url: string,
	event: RequestEvent
): string | null {
	return resolveBackendURL(url, {
		host: event.url.host,
		'x-forwarded-proto': event.url.protocol.replace(':', ''),
	});
};

/**
 * Resolves where the manifest lives for this request, honouring explicit
 * options first and then the `C15T_MANIFEST_URL` / `C15T_BACKEND_URL`
 * environment variables.
 */
const resolveManifestSource = function resolveManifestSource(
	event: RequestEvent,
	options: SvelteKitConsentRouteOptions
): { manifestURL: string } {
	const manifestURL = options.manifestURL ?? getEnv('C15T_MANIFEST_URL');
	if (manifestURL) {
		const resolved = resolveAgainstRequest(manifestURL, event);
		if (!resolved) {
			throw new Error('@c15t/svelte/kit: invalid manifest URL.');
		}
		return { manifestURL: resolved };
	}

	const backendURL = options.backendURL ?? getEnv('C15T_BACKEND_URL');
	if (!backendURL) {
		throw new Error(
			'@c15t/svelte/kit: configure `backendURL`, `manifestURL`, or the C15T_BACKEND_URL environment variable.'
		);
	}
	const resolved = resolveAgainstRequest(backendURL, event);
	if (!resolved) {
		throw new Error('@c15t/svelte/kit: invalid backend URL.');
	}
	return { manifestURL: `${resolved}${MANIFEST_ROUTE_SUFFIX}` };
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
	fetch: typeof globalThis.fetch;
}): Promise<GlobalVendorList | null> {
	const response = await input.fetch(input.reference.url, {
		headers: { 'accept-language': input.language },
		method: 'GET',
	});
	if (response.status === 204) {
		return null;
	}
	if (!response.ok) {
		throw new Error(
			`@c15t/svelte/kit: GVL responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as GlobalVendorList;
};

/**
 * Creates the SvelteKit request handlers for manifest mode.
 *
 * Two shapes are supported. A single catch-all route:
 *
 * ```ts
 * // src/routes/api/c15t/[...path]/+server.ts
 * import { createSvelteKitConsentRouteHandlers } from '@c15t/svelte/kit';
 *
 * export const { GET } = createSvelteKitConsentRouteHandlers({
 *   backendURL: process.env.C15T_BACKEND_URL,
 * });
 * ```
 *
 * …or one file per route, using `init` and `manifest` directly.
 *
 * @param options - Manifest source, fetch implementation, GVL fetcher.
 * @returns `init`, `manifest`, and a `GET` that dispatches between them.
 */
export const createSvelteKitConsentRouteHandlers =
	function createSvelteKitConsentRouteHandlers(
		options: SvelteKitConsentRouteOptions = {}
	): {
		GET: RequestHandler;
		init: RequestHandler;
		manifest: RequestHandler;
	} {
		const init: RequestHandler = async (event) => {
			const { manifestURL } = resolveManifestSource(event, options);
			const { manifest } = await fetchCachedManifest({
				config: { manifestURL },
				fetch: options.fetch,
			});

			const inputs = extractConsentRequestInputs(event.request.headers);
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

			if (shouldFetchGvl(manifest, payload) && manifest.iab?.gvl) {
				const language = payload.translations.language.split('-')[0] || 'en';
				payload.gvl = await (options.fetchGvl ?? defaultFetchGvl)({
					fetch: (options.fetch ??
						globalThis.fetch.bind(globalThis)) as typeof globalThis.fetch,
					language,
					reference: manifest.iab.gvl,
				});
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

		const manifest: RequestHandler = async (event) => {
			const { manifestURL } = resolveManifestSource(event, options);
			const query = event.url.searchParams.toString();
			const result = await fetchCachedManifest({
				config: { manifestURL },
				fetch: options.fetch,
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
			if (etag && event.request.headers.get('if-none-match') === etag) {
				return new Response(null, { headers, status: 304 });
			}

			return new Response(JSON.stringify(result.manifest), {
				headers,
				status: 200,
			});
		};

		const GET: RequestHandler = (event) =>
			event.url.pathname.endsWith(MANIFEST_ROUTE_SUFFIX)
				? manifest(event)
				: init(event);

		return { GET, init, manifest };
	};
