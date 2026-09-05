import { c15tProtocolHeaders } from '@c15t/core';
import type {
	ConsentManifest,
	ConsentManifestGVLReference,
	GlobalVendorList,
	InitOutput,
} from '@c15t/schema/types';
import {
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
	resolveBackendURL,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

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
		headers: { accept: 'application/json', ...c15tProtocolHeaders },
		method: 'GET',
		next: { revalidate },
	};
};

export const fetchCachedManifest = async function fetchCachedManifest(
	request: Request,
	options: NextConsentManifestHandlersOptions = {},
	language?: string | null
): Promise<ManifestFetchResult> {
	const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error('@c15t/nextjs/api: no fetch available.');
	}

	const manifestURL = withLanguage(
		resolveManifestURL(request, options),
		language ?? null
	);
	const init = createManifestFetchInit(options);
	const response = await fetchImpl(manifestURL, init);
	if (!response.ok) {
		throw new Error(
			`@c15t/nextjs/api: /manifest responded ${response.status} ${response.statusText}`
		);
	}

	const cacheControl =
		response.headers.get('cache-control') ?? DEFAULT_MANIFEST_CACHE_CONTROL;
	const revalidate = getSMaxAge(cacheControl) ?? getManifestRevalidate(options);
	return {
		cacheControl,
		etag: response.headers.get('etag') ?? undefined,
		manifest: (await response.json()) as ConsentManifest,
		revalidate,
		status: response.status,
	};
};

const shouldFetchGvl = function shouldFetchGvl(
	manifest: ConsentManifest,
	payload: InitOutput
) {
	return (
		manifest.iab?.enabled === true &&
		manifest.iab.gvl !== undefined &&
		payload.policyResolution?.status === 'matched' &&
		payload.policyResolution.policy.model === 'iab'
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
			...c15tProtocolHeaders,
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

export const createNextConsentRouteHandlers =
	function createNextConsentRouteHandlers(
		options: NextConsentManifestHandlersOptions = {}
	) {
		return {
			async GET(request: Request): Promise<Response> {
				const { manifest } = await fetchCachedManifest(request, options);
				const inputs = extractConsentRequestInputs(request.headers);
				const payload = resolveInitFromManifest(manifest, inputs, {
					baseTranslations,
				});

				const contract = request.headers.get(POLICY_CONTRACT_HEADER);
				if (
					contract !== null &&
					contract.trim() !== String(POLICY_CONTRACT_VERSION)
				) {
					payload.policyResolution = {
						policy: null,
						reason: 'unsupported-contract',
						status: 'failed',
						version: POLICY_CONTRACT_VERSION,
					};

					delete payload.policySnapshotToken;
					delete payload.gvl;
				}

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
						[POLICY_CONTRACT_HEADER]: String(POLICY_CONTRACT_VERSION),
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
					[POLICY_CONTRACT_HEADER]: String(POLICY_CONTRACT_VERSION),
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

const defaultHandlers = createNextConsentRouteHandlers();

export const { GET } = defaultHandlers;
export const { manifestGET } = defaultHandlers;
