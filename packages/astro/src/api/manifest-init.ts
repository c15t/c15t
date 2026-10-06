/**
 * Where the injected routes read the manifest from. The server render
 * resolves through `resolveRequestConsent` in `@c15t/core/server` instead.
 */
import { resolveRequestBackendURL } from '@c15t/core/server';
import type { ConsentRouteFetchGvl } from '@c15t/core/server';

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
		const resolved = resolveRequestBackendURL(manifestURL, {
			headers: source.headers,
			requestURL: source.url,
		});
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
	const resolved = resolveRequestBackendURL(backendURL, {
		headers: source.headers,
		requestURL: source.url,
	});
	if (!resolved) {
		throw new Error('@c15t/astro: invalid backend URL.');
	}
	return `${trimSlash(resolved)}${MANIFEST_ROUTE_SUFFIX}`;
};
