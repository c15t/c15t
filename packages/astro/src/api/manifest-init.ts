/**
 * Manifest resolution shared by the injected routes and the middleware.
 *
 * Both paths need the same three steps: work out where the manifest lives
 * for this request, get it through the process-wide cache in
 * `@c15t/core/server`, and resolve `/init` from it locally. Keeping them on
 * one implementation is what makes manifest mode cheap — a per-render
 * transport would carry its own memo and re-fetch the manifest on every
 * page render, which is exactly the cost manifest mode exists to remove.
 */

import { fetchCachedManifest } from '@c15t/core/server';
import type { ManifestFetch } from '@c15t/core/server';
import type {
	ConsentManifest,
	ConsentManifestGVLReference,
	ConsentRequestHeaderInputs,
	GlobalVendorList,
	InitOutput,
} from '@c15t/schema/types';
import {
	consentInputsToOverrides,
	resolveBackendURL,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import type { C15tResolvedOptions } from '../types';

const MANIFEST_ROUTE_SUFFIX = '/manifest';

/** Fetches the Global Vendor List when the resolved policy is IAB. */
export type FetchGvl = (input: {
	reference: ConsentManifestGVLReference;
	language: string;
	fetch: ManifestFetch;
}) => Promise<GlobalVendorList | null>;

/**
 * The parts of a request URL resolution needs.
 *
 * The middleware has `Astro.locals`-adjacent `Headers` and a URL string; the
 * route handlers have a whole `Request`. Both narrow to this.
 */
export interface RequestSource {
	/** The absolute request URL, when the caller has one. */
	url?: string;
	/** The incoming request headers. */
	headers: Headers;
}

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
 * Seeds the protocol from the request URL rather than letting the shared
 * resolver fall back to `https`, so a relative `backendURL` still resolves
 * on a plain `http://localhost` dev server.
 *
 * Only the request's own URL or `Host` decides the origin — never a
 * forwarded header the caller supplied. The adapter builds `Request.url`
 * from whatever proxy configuration the deployment declared, so trusting
 * `x-forwarded-host` on top of it would let a forged header steer this
 * server-side fetch at a host of the caller's choosing, and a forged
 * `x-forwarded-proto: https` would send a plain-HTTP dev server at a TLS
 * handshake it cannot answer.
 */
const resolveAgainstRequest = function resolveAgainstRequest(
	url: string,
	source: RequestSource
): string | null {
	if (source.url) {
		const requestURL = new URL(source.url);
		return resolveBackendURL(url, {
			host: requestURL.host,
			'x-forwarded-proto': requestURL.protocol.replace(':', ''),
		});
	}
	const hostHeader = source.headers.get('host');
	return hostHeader ? resolveBackendURL(url, { host: hostHeader }) : null;
};

/**
 * Work out where `GET /manifest` lives for this request.
 *
 * Explicit options win, then `C15T_MANIFEST_URL` / `C15T_BACKEND_URL`.
 *
 * @param source - The request URL and headers, used to resolve relative URLs.
 * @param options - The resolved integration options.
 * @returns An absolute manifest URL.
 * @throws {Error} When neither a manifest URL nor a backend URL is configured.
 */
export const resolveManifestSourceFrom = function resolveManifestSourceFrom(
	source: RequestSource,
	options: C15tResolvedOptions
): string {
	const { mode } = options;
	const manifestURL =
		(mode.type === 'manifest' ? mode.manifestURL : undefined) ??
		getEnv('C15T_MANIFEST_URL');
	if (manifestURL) {
		const resolved = resolveAgainstRequest(manifestURL, source);
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
	const resolved = resolveAgainstRequest(backendURL, source);
	if (!resolved) {
		throw new Error('@c15t/astro: invalid backend URL.');
	}
	return `${trimSlash(resolved)}${MANIFEST_ROUTE_SUFFIX}`;
};

/**
 * Load the manifest for this request through the shared in-process cache.
 *
 * An inline `manifest` short-circuits the network entirely; otherwise this
 * is `fetchCachedManifest`, so concurrent requests collapse into one
 * upstream call and later ones revalidate by `ETag` on the backend's
 * schedule instead of re-downloading per render.
 *
 * @param input - Request source, integration options, and a fetch seam.
 * @returns The tenant manifest.
 * @throws {Error} When the manifest source cannot be resolved or the
 * upstream responds non-2xx.
 */
export const loadConsentManifest = async function loadConsentManifest(input: {
	source: RequestSource;
	options: C15tResolvedOptions;
	fetch?: ManifestFetch;
	query?: string;
}): Promise<ConsentManifest> {
	const { mode } = input.options;
	if (mode.type === 'manifest' && mode.manifest) {
		return mode.manifest;
	}
	const manifestURL = resolveManifestSourceFrom(input.source, input.options);
	const { manifest } = await fetchCachedManifest({
		config: { manifestURL },
		fetch: input.fetch,
		query: input.query,
	});
	return manifest;
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

/**
 * How long to wait for the Global Vendor List before giving up on it. The
 * list is a nice-to-have on this path; the response is not, and an open
 * request would hold the page or the route open with it.
 */
const GVL_FETCH_TIMEOUT_MS = 5000;

/** Plain `GET` of the manifest's GVL reference. */
export const defaultFetchGvl: FetchGvl = async function defaultFetchGvl(input) {
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

/** An `InitOutput` carrying the overrides the request implied. */
export type ResolvedInitOutput = InitOutput & {
	resolvedOverrides?: Record<string, unknown>;
};

/**
 * Resolve one request's `/init` payload from an already-loaded manifest.
 *
 * @param input - The manifest, the request inputs, and the GVL seams.
 * @returns The resolved init payload, with `resolvedOverrides` echoed back.
 *   `gvl` is `null` when the vendor list could not be fetched.
 */
export const resolveManifestInit = async function resolveManifestInit(input: {
	manifest: ConsentManifest;
	inputs: ConsentRequestHeaderInputs;
	fetch?: ManifestFetch;
	fetchGvl?: FetchGvl;
}): Promise<ResolvedInitOutput> {
	const { inputs, manifest } = input;
	const payload = resolveInitFromManifest(
		manifest,
		{
			country: inputs.country,
			gpc: inputs.gpc,
			language: inputs.language ?? 'en',
			region: inputs.region,
		},
		{ baseTranslations }
	) as ResolvedInitOutput;

	const fetchImpl =
		input.fetch ?? (globalThis.fetch?.bind(globalThis) as ManifestFetch);
	if (shouldFetchGvl(manifest, payload) && manifest.iab?.gvl && fetchImpl) {
		const language = payload.translations.language.split('-')[0] || 'en';
		try {
			payload.gvl = await (input.fetchGvl ?? defaultFetchGvl)({
				fetch: fetchImpl,
				language,
				reference: manifest.iab.gvl,
			});
		} catch {
			// `gvl` is nullable by contract, and neither the init route nor
			// the SSR path has a boundary above this. A vendor list the
			// client can treat as unavailable beats a 500.
			payload.gvl = null;
		}
	}

	// The resolver's inputs are the only place GPC survives on the SSR
	// path — the browser never sends `Sec-GPC` to the init route when the
	// page was server-rendered. Echo them back so the kernel folds the
	// same overrides it would have derived client-side.
	payload.resolvedOverrides = consentInputsToOverrides(inputs);
	return payload;
};
