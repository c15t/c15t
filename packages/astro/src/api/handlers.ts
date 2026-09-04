/**
 * Route handlers for `/api/c15t/init` and `/api/c15t/manifest`.
 *
 * Same semantics as `@c15t/nextjs/api`: the manifest is fetched once and
 * cached in-process with the backend's own cache headers, `/init` resolves
 * from it per request and is never cached, and the GVL is only fetched when
 * the resolved policy is actually IAB.
 */

import type {
	ConsentManifest,
	ConsentManifestGVLReference,
	GlobalVendorList,
	InitOutput,
} from '@c15t/schema/types';
import {
	extractConsentRequestInputs,
	resolveBackendURL,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import type { C15tResolvedOptions } from '../types';
import { fetchCachedManifest } from './manifest-cache';
import type { ManifestFetch } from './manifest-cache';

const INIT_CACHE_CONTROL = 'private, no-store';
const DEFAULT_MANIFEST_CACHE_CONTROL =
	'public, s-maxage=300, stale-while-revalidate=86400';

/** Options accepted by the route handler factory. */
export interface ConsentRouteHandlerOptions {
	/** The resolved integration options. */
	options: C15tResolvedOptions;
	/** Override fetch, mainly for tests. */
	fetch?: ManifestFetch;
	/** Override the GVL fetcher. */
	fetchGvl?: (input: {
		reference: ConsentManifestGVLReference;
		language: string;
		fetch: ManifestFetch;
	}) => Promise<GlobalVendorList | null>;
}

const getEnv = function getEnv(name: string): string | undefined {
	if (typeof process === 'undefined') {
		return undefined;
	}
	return process.env?.[name];
};

const trimSlash = function trimSlash(value: string): string {
	return value.endsWith('/') ? value.slice(0, -1) : value;
};

/**
 * Work out where `GET /manifest` lives for this request.
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
		const resolved = resolveBackendURL(manifestURL, request.headers);
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
			'@c15t/astro: manifest mode needs `backendURL` or `manifestURL` (or C15T_BACKEND_URL / C15T_MANIFEST_URL).'
		);
	}
	const resolved = resolveBackendURL(backendURL, request.headers);
	if (!resolved) {
		throw new Error('@c15t/astro: invalid backend URL.');
	}
	return `${trimSlash(resolved)}/manifest`;
};

const withLanguage = function withLanguage(
	url: string,
	language: string | null
): string {
	if (!language) {
		return url;
	}
	const next = new URL(url);
	next.searchParams.set('language', language);
	return next.toString();
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
 * @returns Handlers matching Astro's `APIRoute` signature.
 * @example
 * ```ts
 * // src/pages/api/c15t/init.ts
 * import options from 'virtual:c15t/options';
 * import { createConsentRouteHandlers } from '@c15t/astro/api';
 *
 * export const GET = createConsentRouteHandlers({ options }).init;
 * ```
 */
export const createConsentRouteHandlers = function createConsentRouteHandlers(
	handlerOptions: ConsentRouteHandlerOptions
) {
	const fetchImpl =
		handlerOptions.fetch ??
		(globalThis.fetch?.bind(globalThis) as ManifestFetch | undefined);

	return {
		/** `GET /api/c15t/init` — a resolved `InitOutput`, never cached. */
		async init(request: Request): Promise<Response> {
			const { manifest } = await fetchCachedManifest({
				fetch: fetchImpl,
				sourceURL: resolveManifestSourceURL(request, handlerOptions.options),
			});
			const inputs = extractConsentRequestInputs(request.headers);
			const payload = resolveInitFromManifest(manifest, inputs, {
				baseTranslations,
			});

			if (shouldFetchGvl(manifest, payload) && manifest.iab?.gvl && fetchImpl) {
				const language = payload.translations.language.split('-')[0] || 'en';
				payload.gvl = await (handlerOptions.fetchGvl ?? defaultFetchGvl)({
					fetch: fetchImpl,
					language,
					reference: manifest.iab.gvl,
				});
			}

			return Response.json(payload, {
				headers: { 'cache-control': INIT_CACHE_CONTROL },
			});
		},

		/** `GET /api/c15t/manifest` — the manifest, with its own cache headers. */
		async manifest(request: Request): Promise<Response> {
			const requestURL = new URL(request.url);
			const result = await fetchCachedManifest({
				fetch: fetchImpl,
				sourceURL: withLanguage(
					resolveManifestSourceURL(request, handlerOptions.options),
					requestURL.searchParams.get('language')
				),
			});

			const headers = new Headers({
				'cache-control':
					result.headers['cache-control'] ?? DEFAULT_MANIFEST_CACHE_CONTROL,
				'content-type': 'application/json',
			});
			if (result.headers.etag) {
				headers.set('etag', result.headers.etag);
			}

			return new Response(JSON.stringify(result.manifest), {
				headers,
				status: 200,
			});
		},
	};
};
