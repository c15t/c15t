/**
 * `@c15t/tanstack-start/api` same-origin consent routes.
 *
 * Mount one splat server route and both endpoints exist:
 *
 * ```ts
 * // src/routes/api/c15t/$.ts
 * import { createFileRoute } from '@tanstack/react-router';
 * import { createConsentServerRoute } from '@c15t/tanstack-start/api';
 *
 * export const Route = createFileRoute('/api/c15t/$')({
 *   server: { handlers: createConsentServerRoute() },
 * });
 * ```
 *
 * - `GET /api/c15t/manifest` passes the cached backend manifest through
 *   with its cache headers, so browsers and CDNs can cache it.
 * - `GET /api/c15t/init` resolves init in-process from that manifest for
 *   the request's geo, language, and GPC signal. `ConsentBoundary` points
 *   `initURL` here by default; a client language switch re-hits it.
 *
 * `POST /subjects` is deliberately not proxied: consent saves go straight
 * to `backendURL`, which mirrors the Next.js and Nuxt adapters.
 */

import {
	fetchCachedManifest,
	MANIFEST_PASSTHROUGH_HEADERS,
	resolveManifestInit,
	resolveManifestSourceURL,
} from '@c15t/core/transports/manifest-cache';
import type { ManifestCache } from '@c15t/core/transports/manifest-cache';
import type {
	ConsentManifest,
	ConsentManifestGVLReference,
	GlobalVendorList,
	InitOutput,
} from '@c15t/schema/types';

import { resolveRequestURL } from './libs/request-url';

const INIT_CACHE_CONTROL = 'private, no-store';

/** Options for {@link createConsentServerRoute}. */
export interface ConsentServerRouteOptions {
	/**
	 * Backend base URL that serves `/manifest`, for example
	 * `https://consent.example.com`. Defaults to the `C15T_BACKEND_URL`
	 * environment variable, then `VITE_C15T_BACKEND_URL`.
	 */
	backendURL?: string;

	/**
	 * Full manifest URL. Overrides `${backendURL}/manifest`. Defaults to
	 * the `C15T_MANIFEST_URL` environment variable.
	 */
	manifestURL?: string;

	/**
	 * Fetch implementation for manifest and GVL requests. Defaults to
	 * `globalThis.fetch`.
	 */
	fetch?: typeof globalThis.fetch;

	/**
	 * Custom Global Vendor List fetcher. Called only when the manifest
	 * enables IAB and the resolved policy is the IAB model.
	 */
	fetchGvl?: (input: {
		reference: ConsentManifestGVLReference;
		language: string;
		fetch: typeof globalThis.fetch;
	}) => Promise<GlobalVendorList | null>;

	/**
	 * Manifest cache to read through. Defaults to the module-level cache
	 * shared with `prefetchInitialConsent()`.
	 */
	cache?: ManifestCache;
}

/**
 * The argument TanStack Start passes to a server route handler. Only the
 * fields the consent handlers read are declared, so plain objects work in
 * tests.
 */
export interface ConsentRouteHandlerContext {
	request: Request;
	params?: { _splat?: string };
}

/** A server route handler compatible with `server.handlers.GET`. */
export type ConsentRouteHandler = (
	context: ConsentRouteHandlerContext
) => Promise<Response>;

/** Handlers returned by {@link createConsentServerRoute}. */
export interface ConsentServerRouteHandlers {
	/**
	 * Splat handler: serves `manifest` and `init` under one file route.
	 */
	GET: ConsentRouteHandler;
	/** Manifest passthrough for a dedicated `/api/c15t/manifest` route. */
	manifestGET: ConsentRouteHandler;
	/** Init resolver for a dedicated `/api/c15t/init` route. */
	initGET: ConsentRouteHandler;
}

type EnvRecord = Record<string, string | undefined>;

/**
 * Reads an environment variable without assuming Node globals exist:
 * `process.env` on Node and Vercel, then Vite's `import.meta.env` for
 * `VITE_*` variables on other hosts.
 */
const getEnv = function getEnv(name: string): string | undefined {
	const processEnv = (globalThis as { process?: { env?: EnvRecord } }).process
		?.env;
	if (processEnv?.[name]) {
		return processEnv[name];
	}
	const metaEnv = (import.meta as { env?: EnvRecord }).env;
	return metaEnv?.[name] || undefined;
};

const resolveSourceURL = function resolveSourceURL(
	request: Request,
	options: ConsentServerRouteOptions
): string {
	const manifestURL = options.manifestURL ?? getEnv('C15T_MANIFEST_URL');
	if (manifestURL) {
		const resolved = resolveRequestURL(manifestURL, request);
		if (!resolved) {
			throw new Error('@c15t/tanstack-start/api: invalid manifestURL.');
		}
		return resolved;
	}
	const backendURL =
		options.backendURL ??
		getEnv('C15T_BACKEND_URL') ??
		getEnv('VITE_C15T_BACKEND_URL');
	if (!backendURL) {
		throw new Error(
			'@c15t/tanstack-start/api: configure backendURL, C15T_BACKEND_URL, or C15T_MANIFEST_URL.'
		);
	}
	const resolved = resolveRequestURL(backendURL, request);
	if (!resolved) {
		throw new Error('@c15t/tanstack-start/api: invalid backendURL.');
	}
	return resolveManifestSourceURL({ backendURL: resolved });
};

const readLanguageQuery = function readLanguageQuery(
	request: Request
): string | undefined {
	const language = new URL(request.url).searchParams.get('language');
	return language ? `language=${encodeURIComponent(language)}` : undefined;
};

const shouldFetchGvl = function shouldFetchGvl(
	manifest: ConsentManifest,
	payload: InitOutput
) {
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
		headers: {
			'accept-language': input.language,
		},
		method: 'GET',
	});
	if (response.status === 204) {
		return null;
	}
	if (!response.ok) {
		throw new Error(
			`@c15t/tanstack-start/api: GVL responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as GlobalVendorList;
};

const readSplat = function readSplat(
	context: ConsentRouteHandlerContext
): string {
	const splat = context.params?._splat;
	if (splat !== undefined) {
		return splat.replace(/^\/+|\/+$/gu, '');
	}
	const { pathname } = new URL(context.request.url);
	return pathname.replace(/\/+$/u, '').split('/').pop() ?? '';
};

/**
 * Creates the same-origin consent route handlers.
 *
 * @param options - Backend location, fetch, GVL, and cache overrides.
 * @returns Handlers for `createFileRoute('/api/c15t/$')({ server: { handlers } })`.
 * @example
 * ```ts
 * export const Route = createFileRoute('/api/c15t/$')({
 *   server: {
 *     handlers: createConsentServerRoute({
 *       backendURL: 'https://consent.example.com',
 *     }),
 *   },
 * });
 * ```
 */
export const createConsentServerRoute = function createConsentServerRoute(
	options: ConsentServerRouteOptions = {}
): ConsentServerRouteHandlers {
	const manifestGET: ConsentRouteHandler = async ({ request }) => {
		const cached = await fetchCachedManifest({
			cache: options.cache,
			fetch: options.fetch,
			query: readLanguageQuery(request),
			sourceURL: resolveSourceURL(request, options),
		});

		const headers = new Headers({ 'content-type': 'application/json' });
		for (const name of MANIFEST_PASSTHROUGH_HEADERS) {
			const value = cached.headers[name];
			if (value) {
				headers.set(name, value);
			}
		}

		const { etag } = cached.headers;
		if (etag && request.headers.get('if-none-match') === etag) {
			return new Response(null, { headers, status: 304 });
		}
		return new Response(JSON.stringify(cached.manifest), {
			headers,
			status: 200,
		});
	};

	const initGET: ConsentRouteHandler = async ({ request }) => {
		const cached = await fetchCachedManifest({
			cache: options.cache,
			fetch: options.fetch,
			sourceURL: resolveSourceURL(request, options),
		});
		const payload = resolveManifestInit({
			headers: request.headers,
			manifest: cached.manifest,
		});

		if (shouldFetchGvl(cached.manifest, payload) && cached.manifest.iab?.gvl) {
			const language = payload.translations.language.split('-')[0] || 'en';
			payload.gvl = await (options.fetchGvl ?? defaultFetchGvl)({
				fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
				language,
				reference: cached.manifest.iab.gvl,
			});
		}

		return Response.json(payload, {
			headers: { 'cache-control': INIT_CACHE_CONTROL },
		});
	};

	const GET: ConsentRouteHandler = (context) => {
		switch (readSplat(context)) {
			case 'manifest':
				return manifestGET(context);
			case 'init':
				return initGET(context);
			default:
				return Promise.resolve(
					Response.json({ error: 'Not found' }, { status: 404 })
				);
		}
	};

	return { GET, initGET, manifestGET };
};

const defaultHandlers = createConsentServerRoute();

/** Splat handler configured from environment variables. */
export const { GET } = defaultHandlers;
/** Manifest handler configured from environment variables. */
export const { manifestGET } = defaultHandlers;
/** Init handler configured from environment variables. */
export const { initGET } = defaultHandlers;
