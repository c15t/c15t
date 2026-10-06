/**
 * Resolve `/init` locally from the backend's consent manifest, for server
 * adapters that render from a cached manifest (Nuxt, TanStack Start).
 *
 * The manifest itself is read through the one process cache,
 * `fetchCachedManifest` from `@c15t/core/server`, which honours the
 * backend's `s-maxage`, revalidates with `ETag`, respects `no-store`, and
 * collapses bursts for backends that send no shared-cache TTL at all.
 *
 * Like `@c15t/core/transports/manifest`, this module resolves init with
 * `@c15t/schema` and imports every translation language. Import it from
 * `@c15t/core/transports/manifest-cache` in server code only.
 */

import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import type {
	ConsentManifest,
	InitOutput,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

export {
	DEFAULT_RESOLVE_TIMEOUT_MS,
	withResolutionBudget,
} from '../libs/manifest-cache-runtime';
/** Request headers accepted by {@link resolveManifestInit}. */
export type ManifestRequestHeaders =
	| Headers
	| Record<string, string | string[] | undefined>;

const normalizeHeader = function normalizeHeader(
	value: string | string[] | undefined
): string | undefined {
	if (!value) {
		return undefined;
	}
	return Array.isArray(value) ? value[0] : value;
};

/**
 * Derives manifest resolver inputs (geo, language, GPC) from request headers.
 *
 * @param headers - A `Headers` instance or a header record (any key casing).
 * @returns Inputs for `resolveInitFromManifest`; language falls back to `en`.
 */
export const getResolverInputsFromHeaders =
	function getResolverInputsFromHeaders(
		headers: ManifestRequestHeaders
	): ResolveInitFromManifestInputs {
		let source: Headers | Record<string, string | undefined>;
		if (headers instanceof Headers) {
			source = headers;
		} else {
			const normalized: Record<string, string | undefined> = {};
			for (const [key, value] of Object.entries(headers)) {
				normalized[key.toLowerCase()] = normalizeHeader(value);
			}
			source = normalized;
		}
		const inputs = extractConsentRequestInputs(source);

		return {
			country: inputs.country,
			gpc: inputs.gpc,
			language: inputs.language ?? 'en',
			region: inputs.region,
		};
	};

/** Input for {@link resolveManifestInit}. */
export type ResolveManifestInitOptions =
	| {
			/** The manifest to resolve against. */
			manifest: ConsentManifest;
			/** Request headers the resolver inputs are derived from. */
			headers: ManifestRequestHeaders;
			inputs?: never;
	  }
	| {
			/** The manifest to resolve against. */
			manifest: ConsentManifest;
			/** Explicit resolver inputs, used as-is. */
			inputs: ResolveInitFromManifestInputs;
			headers?: never;
	  };

/**
 * Resolves a `GET /init` response locally from a manifest.
 *
 * Mirrors what the backend's `/init` returns, minus a `policySnapshotToken`:
 * pair it with `hosted({ assertDecisionInputs: true })` on the client so saves
 * stay bound to the decision they were made against.
 *
 * @param options - The manifest plus either request headers or explicit inputs.
 * @returns The resolved init output including `resolvedOverrides`.
 */
export const resolveManifestInit = function resolveManifestInit(
	options: ResolveManifestInitOptions
): InitOutput {
	const inputs =
		options.inputs ?? getResolverInputsFromHeaders(options.headers);
	return {
		...resolveInitFromManifest(options.manifest, inputs, { baseTranslations }),
		// Resolver inputs use `null` for absent; the overrides record wants
		// the fields dropped instead.
		resolvedOverrides: consentInputsToOverrides({
			country: inputs.country ?? undefined,
			language: inputs.language ?? undefined,
			region: inputs.region ?? undefined,
		}),
		resolvedPrivacySignals: { gpc: inputs.gpc },
	} as InitOutput;
};
