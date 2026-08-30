/**
 * `GET /manifest` — the geo-independent, CDN-cacheable consent manifest.
 *
 * The manifest is per-tenant static configuration, and resolving an `/init`
 * response from it is a pure function. Both of those live in `@c15t/schema`,
 * so this route is transport and caching only — it builds nothing itself.
 *
 * That is deliberate and load-bearing during the parallel phase. Two backends
 * serve the same tenants; if they built manifests independently, a divergence
 * would break clients that cached one and resolved against the other, and it
 * would silently invalidate both the contract tests and the benchmark. RFC
 * 0001 states the principle — exactly one implementation — and RFC 0004 relies
 * on it.
 *
 * Nothing here touches the database. `/manifest` is config, not data.
 */

import {
	buildConsentManifestFromConfig,
	sliceConsentManifestLanguage,
} from '@c15t/schema/types';
import type { ConsentManifestConfig } from '@c15t/schema/types';

/** Matches the shipped defaults in `routes/manifest.ts`. */
export const DEFAULT_MANIFEST_S_MAXAGE = 300;
export const DEFAULT_MANIFEST_STALE_WHILE_REVALIDATE = 86_400;

export interface ManifestCacheOptions {
	readonly sMaxAge?: number;
	readonly staleWhileRevalidate?: number;
}

function normalizeCacheSeconds(
	value: number | undefined,
	fallback: number
): number {
	// A negative or non-finite value is a configuration mistake, not an
	// instruction to disable caching — fall back rather than emit nonsense
	// into a header a CDN will act on.
	return Number.isFinite(value) && value !== undefined && value >= 0
		? Math.floor(value)
		: fallback;
}

export function createManifestCacheControl(
	cache: ManifestCacheOptions | undefined
): string {
	const sMaxAge = normalizeCacheSeconds(
		cache?.sMaxAge,
		DEFAULT_MANIFEST_S_MAXAGE
	);
	const staleWhileRevalidate = normalizeCacheSeconds(
		cache?.staleWhileRevalidate,
		DEFAULT_MANIFEST_STALE_WHILE_REVALIDATE
	);
	return `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
}

export interface ManifestResult {
	readonly body: unknown;
	readonly etag: string;
	readonly cacheControl: string;
}

/**
 * Builds the manifest response.
 *
 * `?language=` serves a single-language slice with identical cache semantics —
 * the slice is derived from the same manifest, so it cannot drift from the
 * full document.
 */
export async function buildManifestResponse(
	config: ConsentManifestConfig,
	cache: ManifestCacheOptions | undefined,
	language: string | null
): Promise<ManifestResult> {
	const manifest = await buildConsentManifestFromConfig(config);

	return {
		body: language
			? sliceConsentManifestLanguage(manifest, language)
			: manifest,
		// The revision already fingerprints the manifest, so it is the etag.
		// Deriving a second hash would risk the two disagreeing.
		etag: `"${manifest.revision}"`,
		cacheControl: createManifestCacheControl(cache),
	};
}
