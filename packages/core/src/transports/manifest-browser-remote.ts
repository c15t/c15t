/**
 * The network half of the browser manifest resolver: fetching the manifest
 * when the build bundled none, and asking `geoURL` for the visitor's
 * location. A page with a bundled snapshot and no `geoURL` never runs
 * either, so the resolver loads this module only when it needs one.
 *
 * @internal
 */
import type { ConsentManifest } from '@c15t/schema/types';

import type { ManifestModeInputs } from '../modes';
import { createManifestRequestInit } from './manifest-request';

/**
 * Fetch the backend's consent manifest.
 *
 * @param manifestURL - Where the manifest lives.
 * @param fetchImpl - Fetch implementation.
 * @param options - Request headers and credentials mode.
 * @returns The manifest.
 * @throws {Error} When the backend answers with an error status.
 * @internal
 */
export const fetchManifest = async function fetchManifest(
	manifestURL: string,
	fetchImpl: typeof globalThis.fetch,
	options: {
		credentials?: RequestCredentials;
		headers?: Record<string, string>;
	}
): Promise<ConsentManifest> {
	const response = await fetchImpl(
		manifestURL,
		createManifestRequestInit(options)
	);
	if (!response.ok) {
		throw new Error(
			`c15t manifest transport: /manifest responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as ConsentManifest;
};

const normalizeGeoValue = function normalizeGeoValue(
	value: unknown
): string | undefined {
	return typeof value === 'string' && value.trim()
		? value.trim().toUpperCase()
		: undefined;
};

/**
 * Ask a same-origin route for the visitor's `{ country, region }`.
 *
 * @param geoURL - The route.
 * @param fetchImpl - Fetch implementation.
 * @returns The location, or `undefined` when the route fails; the `/init`
 * fallback still answers then.
 * @internal
 */
export const fetchGeoInputs = async function fetchGeoInputs(
	geoURL: string,
	fetchImpl: typeof globalThis.fetch
): Promise<ManifestModeInputs | undefined> {
	try {
		const response = await fetchImpl(geoURL, {
			credentials: 'same-origin',
			headers: { accept: 'application/json' },
			method: 'GET',
		});
		if (!response.ok) {
			return undefined;
		}
		const payload = (await response.json()) as {
			country?: unknown;
			region?: unknown;
		};
		return {
			country: normalizeGeoValue(payload.country),
			region: normalizeGeoValue(payload.region),
		};
	} catch {
		return undefined;
	}
};
