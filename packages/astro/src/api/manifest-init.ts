import { deferInitGvlToRoute } from '@c15t/core';
/**
 * Manifest resolution for the middleware's server render.
 *
 * It reads the manifest through the process-wide cache in
 * `@c15t/core/server` and resolves `/init` with the same core function the
 * injected routes use (`resolveConsentInit`), so a render and the init
 * route agree on the policy, the vendor list and the session report. A
 * per-render transport would carry its own memo and re-fetch the manifest
 * on every page render, which is exactly the cost manifest mode exists to
 * remove.
 */
import {
	fetchCachedGvl,
	fetchCachedManifest,
	resolveConsentInit,
	resolveRequestBackendURL,
	resolveSessionReportBackendURL,
} from '@c15t/core/server';
import type { ConsentRouteFetchGvl, ManifestFetch } from '@c15t/core/server';
import type {
	ConsentManifest,
	ConsentRequestHeaderInputs,
	ConsentSessionSource,
	InitOutput,
} from '@c15t/schema/types';

import type { C15tResolvedOptions } from '../types';

const MANIFEST_ROUTE_SUFFIX = '/manifest';

/** Fetches the Global Vendor List when the resolved policy is IAB. */
export type FetchGvl = ConsentRouteFetchGvl;

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

const trimSlash = function trimSlash(value: string): string {
	return value.endsWith('/') ? value.slice(0, -1) : value;
};

/**
 * Resolves a possibly-relative backend URL against the request, with the
 * rule every adapter shares (`resolveRequestBackendURL`).
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
	return resolveRequestBackendURL(url, {
		headers: source.headers,
		requestURL: source.url,
	});
};

/**
 * Work out where `GET /manifest` lives for this request.
 *
 * `manifestURL` when set, otherwise `${backendURL}/manifest`.
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
	const manifestURL = mode.type === 'manifest' ? mode.manifestURL : undefined;
	if (manifestURL) {
		const resolved = resolveAgainstRequest(manifestURL, source);
		if (!resolved) {
			throw new Error('@c15t/astro: invalid manifest URL.');
		}
		return resolved;
	}

	const backendURL =
		(mode.type === 'manifest' ? mode.backendURL : undefined) ??
		(mode.type === 'hosted' ? mode.url : undefined);
	if (!backendURL) {
		throw new Error('@c15t/astro: pass backendURL or manifestURL.');
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
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;
}): Promise<ConsentManifest> {
	const { mode } = input.options;
	if (mode.type === 'manifest' && mode.manifest) {
		return mode.manifest;
	}
	const manifestURL = resolveManifestSourceFrom(input.source, input.options);
	const { manifest } = await fetchCachedManifest({
		fetch: input.fetch,
		onBackgroundRevalidate: input.onBackgroundRevalidate,
		query: input.query,
		sourceURL: manifestURL,
	});
	return manifest;
};

/** An `InitOutput` carrying the overrides the request implied. */
export type ResolvedInitOutput = InitOutput & {
	resolvedOverrides?: Record<string, unknown>;
};

/** How a resolution reports itself to the backend's `POST /sessions`. */
export interface SessionReportTarget {
	/** Where the resolution happened. */
	source: ConsentSessionSource;
	/** The visitor's request headers; only IP chain and user agent travel. */
	headers: Headers;
	/** Absolute backend URL, or `undefined` to send no report. */
	backendURL: string | undefined;
	/** The request's method, when there is one; only a `GET` is reported. */
	method?: string;
	/** Keeps the detached report alive on runtimes that need it. */
	waitUntil?: (task: Promise<void>) => void;
	/**
	 * Whether the caller stopped waiting for this resolution, checked just
	 * before the report goes out. A render that gave up leaves the browser
	 * to resolve the view through the init route, which reports it instead.
	 */
	abandoned?: () => boolean;
	/**
	 * The experiment arm this render ran, while the visitor has no stored
	 * choice. An init route leaves it out: the browser's own request carries
	 * it as a header.
	 */
	experiment?: { id: string; arm: string };
}

/**
 * Where a resolution reports sessions, when it can: an absolute backend,
 * read as configured rather than resolved against the request. A relative
 * backend resolved to this site's origin is its own injected route, not a
 * backend, and means no report; nothing is inferred from a manifest URL.
 * `undefined` when reporting is off or nothing absolute is set.
 *
 * @param options - The resolved integration options.
 * @returns The backend base URL, or `undefined`.
 */
export const resolveSessionReportURL = function resolveSessionReportURL(
	options: C15tResolvedOptions
): string | undefined {
	const { mode } = options;
	if (mode.type !== 'manifest' || mode.reportSessions === false) {
		return undefined;
	}
	return resolveSessionReportBackendURL({ backendURL: mode.backendURL });
};

/**
 * Resolve one request's `/init` payload from an already-loaded manifest,
 * with the core rule the init route uses.
 *
 * @param input - The manifest, the request inputs, and the GVL seams.
 * @returns The resolved init payload, with `resolvedOverrides` echoed back.
 * @throws {Error} When the vendor list an IAB policy needs cannot be loaded; the
 * render then leaves the policy to the browser.
 */
export const resolveManifestInit = async function resolveManifestInit(input: {
	manifest: ConsentManifest;
	inputs: ConsentRequestHeaderInputs;
	fetch?: ManifestFetch;
	/** Same-origin init route that serves versioned public lists. */
	gvlRoute?: string;
	fetchGvl?: FetchGvl;
	/** Session report to send once resolved. Absent means none. */
	report?: SessionReportTarget;
}): Promise<ResolvedInitOutput> {
	const { inputs, manifest, report } = input;
	const reference = manifest.iab?.gvl;
	const payload = await resolveConsentInit({
		inputs: { ...inputs, language: inputs.language ?? 'en' },
		loadGvl: reference
			? (language) =>
					input.fetchGvl
						? input.fetchGvl({
								fetch: (input.fetch ??
									globalThis.fetch.bind(globalThis)) as typeof globalThis.fetch,
								language,
								reference,
							})
						: fetchCachedGvl({
								fetch: input.fetch,
								language,
								url: reference.url,
							})
			: undefined,
		manifest,
		report: report
			? {
					...report,
					adapter: '@c15t/astro',
					fetch: input.fetch as typeof globalThis.fetch | undefined,
				}
			: undefined,
	});
	// The route serves only lists from the shared cache; a caller's own
	// fetch keeps its list inline.
	return input.gvlRoute && !input.fetch && !input.fetchGvl
		? deferInitGvlToRoute(payload, input.gvlRoute)
		: payload;
};
