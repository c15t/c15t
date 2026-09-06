import { c15tVersionHeaders } from '@c15t/core';
import { fetchCachedManifest as fetchManifestThroughCache } from '@c15t/core/libs/manifest-cache';
import type {
	ConsentManifest,
	ConsentManifestGVLReference,
	GlobalVendorList,
	InitOutput,
} from '@c15t/schema/types';
import { resolveBackendURL, resolveInitFromManifest } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import type { ConsentConfig } from './config';
import { isConsentConfig } from './config';
import { extractConsentRequestInputs } from './headers';

const DEFAULT_MANIFEST_REVALIDATE_SECONDS = 300;
const DEFAULT_MANIFEST_CACHE_CONTROL =
	'public, s-maxage=300, stale-while-revalidate=86400';
const INIT_CACHE_CONTROL = 'private, no-store';

type NextFetchInit = RequestInit & {
	next?: {
		revalidate?: number | false;
		tags?: string[];
	};
};

export interface NextConsentManifestHandlersOptions {
	/**
	 * Backend base URL that serves `/manifest`.
	 * Defaults to `C15T_BACKEND_URL` or `NEXT_PUBLIC_C15T_BACKEND_URL`.
	 */
	backendURL?: string;

	/**
	 * Full manifest URL. Overrides `backendURL + "/manifest"`.
	 * Defaults to `C15T_MANIFEST_URL`.
	 */
	manifestURL?: string;

	/**
	 * Next.js Data Cache lifetime for the manifest fetch.
	 * Defaults to the backend manifest route's default `s-maxage` of 300s.
	 */
	manifestRevalidateSeconds?: number | false;

	fetch?: typeof globalThis.fetch;

	fetchGvl?: (input: {
		reference: ConsentManifestGVLReference;
		language: string;
		fetch: typeof globalThis.fetch;
	}) => Promise<GlobalVendorList | null>;
}

export interface ManifestFetchResult {
	manifest: ConsentManifest;
	cacheControl: string;
	etag?: string;
	revalidate: number | false;
	status: number;
}

const getEnv = function getEnv(name: string): string | undefined {
	if (typeof process === 'undefined') {
		return undefined;
	}
	return process.env?.[name];
};

const readManifestRevalidateFromEnv = function readManifestRevalidateFromEnv():
	| number
	| false
	| undefined {
	const raw = getEnv('C15T_MANIFEST_REVALIDATE_SECONDS');
	if (raw === undefined) {
		return undefined;
	}
	if (raw === 'false') {
		return false;
	}
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const getRequestResolutionHeaders = function getRequestResolutionHeaders(
	request: Request
): Record<string, string> {
	const url = new URL(request.url);
	const headers: Record<string, string> = {
		host: url.host,
	};
	for (const name of [
		'x-forwarded-proto',
		'x-forwarded-ssl',
		'x-forwarded-host',
		'host',
		'referer',
	]) {
		const value = request.headers.get(name);
		if (value) {
			headers[name] = value;
		}
	}
	return headers;
};

const resolveRequestURL = function resolveRequestURL(
	backendURL: string,
	request: Request
): string | null {
	return resolveBackendURL(backendURL, getRequestResolutionHeaders(request));
};

const resolveManifestURL = function resolveManifestURL(
	request: Request,
	options: NextConsentManifestHandlersOptions
): string {
	const manifestURL = options.manifestURL ?? getEnv('C15T_MANIFEST_URL');
	if (manifestURL) {
		const resolved = resolveRequestURL(manifestURL, request);
		if (!resolved) {
			throw new Error('@c15t/nextjs/api: invalid C15T_MANIFEST_URL.');
		}
		return resolved;
	}

	const backendURL =
		options.backendURL ??
		getEnv('C15T_BACKEND_URL') ??
		getEnv('NEXT_PUBLIC_C15T_BACKEND_URL');
	if (!backendURL) {
		throw new Error(
			'@c15t/nextjs/api: configure C15T_BACKEND_URL or C15T_MANIFEST_URL.'
		);
	}
	const resolved = resolveRequestURL(backendURL, request);
	if (!resolved) {
		throw new Error('@c15t/nextjs/api: invalid C15T_BACKEND_URL.');
	}
	return `${resolved}/manifest`;
};

const withLanguage = function withLanguage(
	url: string,
	language: string | null
) {
	if (!language) {
		return url;
	}
	const next = new URL(url);
	next.searchParams.set('language', language);
	return next.toString();
};

export const getSMaxAge = function getSMaxAge(
	cacheControl: string | null
): number | undefined {
	if (!cacheControl) {
		return undefined;
	}
	for (const part of cacheControl.split(',')) {
		const [key, value] = part.trim().split('=');
		if (key?.toLowerCase() !== 's-maxage' || value === undefined) {
			continue;
		}
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed) && parsed >= 0) {
			return parsed;
		}
	}
	return undefined;
};

const getManifestRevalidate = function getManifestRevalidate(
	options: NextConsentManifestHandlersOptions
): number | false {
	return (
		options.manifestRevalidateSeconds ??
		readManifestRevalidateFromEnv() ??
		DEFAULT_MANIFEST_REVALIDATE_SECONDS
	);
};

export const createManifestFetchInit = function createManifestFetchInit(
	options: NextConsentManifestHandlersOptions = {}
): NextFetchInit {
	const revalidate = getManifestRevalidate(options);
	return {
		headers: { accept: 'application/json', ...c15tVersionHeaders },
		method: 'GET',
		next: { revalidate },
	};
};

export const fetchCachedManifest = async function fetchCachedManifest(
	request: Request,
	options: NextConsentManifestHandlersOptions = {},
	language?: string | null
): Promise<ManifestFetchResult> {
	const manifestURL = withLanguage(
		resolveManifestURL(request, options),
		language ?? null
	);
	// Two layers on purpose. `next.revalidate` reaches the App Router Data
	// Cache; the in-process cache covers the Pages Router and any other
	// runtime without one, and adds ETag revalidation on top.
	const {
		headers: nextHeaders,
		method,
		...init
	} = createManifestFetchInit(options);
	void method;
	const cached = await fetchManifestThroughCache({
		fetch: options.fetch,
		headers: nextHeaders as Record<string, string>,
		init,
		url: manifestURL,
	});

	const cacheControl =
		cached.headers['cache-control'] ?? DEFAULT_MANIFEST_CACHE_CONTROL;
	const revalidate = getSMaxAge(cacheControl) ?? getManifestRevalidate(options);
	return {
		cacheControl,
		etag: cached.headers.etag,
		manifest: cached.manifest,
		revalidate,
		status: 200,
	};
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
			`@c15t/nextjs/api: GVL responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as GlobalVendorList;
};

/**
 * Handler options from either the explicit options bag or a
 * `defineConsentConfig` result.
 *
 * A config's `manifestURL` and `initURL` name the same-origin routes these
 * handlers serve, so only `backendURL` carries over; forwarding
 * `manifestURL` would make the manifest route fetch itself.
 */
const toHandlerOptions = function toHandlerOptions(
	options: NextConsentManifestHandlersOptions | ConsentConfig
): NextConsentManifestHandlersOptions {
	if (!isConsentConfig(options)) {
		return options;
	}
	const { initURL, manifestURL, ...rest } = options as ConsentConfig &
		NextConsentManifestHandlersOptions;
	void initURL;
	void manifestURL;
	return rest;
};

/**
 * Build the App Router route handlers for the consent routes.
 *
 * @param options - Handler options, or a `defineConsentConfig` result. From a
 * config only `backendURL` is used: its `manifestURL` and `initURL` are the
 * routes these handlers serve.
 * @returns `GET` for the init route and `manifestGET` for the manifest route.
 * @example
 * ```ts
 * // app/api/consent/manifest/route.ts
 * import { createNextConsentRouteHandlers } from '@c15t/nextjs/api';
 * import { consentConfig } from '@/consent.config';
 *
 * export const { manifestGET: GET } =
 *   createNextConsentRouteHandlers(consentConfig);
 * ```
 */
export const createNextConsentRouteHandlers =
	function createNextConsentRouteHandlers(
		optionsOrConfig: NextConsentManifestHandlersOptions | ConsentConfig = {}
	) {
		const options = toHandlerOptions(optionsOrConfig);
		return {
			async GET(request: Request): Promise<Response> {
				const { manifest } = await fetchCachedManifest(request, options);
				const inputs = extractConsentRequestInputs(request.headers);
				const payload = resolveInitFromManifest(manifest, inputs, {
					baseTranslations,
				});

				if (shouldFetchGvl(manifest, payload) && manifest.iab?.gvl) {
					const language = payload.translations.language.split('-')[0] || 'en';
					payload.gvl = await (options.fetchGvl ?? defaultFetchGvl)({
						fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
						language,
						reference: manifest.iab.gvl,
					});
				}

				return Response.json(payload, {
					headers: {
						'cache-control': INIT_CACHE_CONTROL,
					},
				});
			},

			async manifestGET(request: Request): Promise<Response> {
				const requestURL = new URL(request.url);
				const result = await fetchCachedManifest(
					request,
					options,
					requestURL.searchParams.get('language')
				);
				const headers = new Headers({
					'cache-control': result.cacheControl,
					'content-type': 'application/json',
				});
				if (result.etag) {
					headers.set('etag', result.etag);
				}
				headers.set('x-c15t-next-revalidate', String(result.revalidate));

				return new Response(JSON.stringify(result.manifest), {
					headers,
					status: 200,
				});
			},
		};
	};

export type { ConsentConfig } from './config';
export { defineConsentConfig } from './config';

const defaultHandlers = createNextConsentRouteHandlers();

export const { GET } = defaultHandlers;
export const { manifestGET } = defaultHandlers;
