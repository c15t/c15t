import {
	c15tProtocolHeaders,
	createHostedTransport,
	mapInitOutputToInitResponse,
} from '@c15t/core';
import type {
	InitContext,
	InitResponse,
	KernelOverrides,
	KernelTransport,
	ProviderTransportFactory,
} from '@c15t/core';
import type {
	ConsentManifest,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';
import { resolveInitFromManifest } from '@c15t/schema/types';
import { enTranslations } from '@c15t/translations';
import type { BaseTranslations } from '@c15t/translations/all';

/** Options for {@link manifest}. */
export interface ManifestModeOptions {
	/**
	 * The manifest itself, inlined. With it the first render needs no
	 * request at all for a policy that does not depend on location.
	 */
	manifest?: ConsentManifest;
	/** Where to fetch the manifest when it is not inlined. */
	manifestURL?: string;
	/**
	 * Backend origin for `POST /subjects`, and for `GET /init` when the
	 * policy depends on a location the browser does not know. Derived from
	 * `manifestURL` when omitted.
	 */
	backendURL?: string;
	/**
	 * Decision inputs known ahead of time, typically the country an edge
	 * worker injected into the page. Kernel overrides win over these.
	 */
	inputs?: ResolveInitFromManifestInputs;
	/** Fetch implementation. Defaults to `globalThis.fetch`. */
	fetch?: typeof globalThis.fetch;
}

const trimSlash = function trimSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
};

const deriveBackendURL = function deriveBackendURL(
	options: ManifestModeOptions
): string | undefined {
	if (options.backendURL) {
		return trimSlash(options.backendURL);
	}
	if (!options.manifestURL) {
		return undefined;
	}
	const withoutQuery =
		options.manifestURL.split(/[?#]/u)[0] ?? options.manifestURL;
	const trimmed = trimSlash(withoutQuery);
	return trimmed.endsWith('/manifest')
		? trimmed.slice(0, -'/manifest'.length)
		: trimmed;
};

/**
 * Whether resolving this manifest needs to know where the visitor is.
 *
 * A manifest whose packs all match by default or fallback — "one banner
 * for everyone" — resolves the same everywhere, so the browser can do it
 * without a round trip. Anything keyed by country or region, or the
 * jurisdiction defaults that apply without packs, needs a location.
 *
 * @param manifest - The manifest.
 * @returns `true` when a country is required for a faithful answer.
 */
export const manifestNeedsLocation = function manifestNeedsLocation(
	manifest: ConsentManifest
): boolean {
	if (manifest.defaults?.disableGeoLocation) {
		return false;
	}
	const packs = manifest.policyPacks ?? [];
	if (packs.length === 0) {
		return true;
	}
	return packs.some(
		(pack) =>
			(pack.match.countries?.length ?? 0) > 0 ||
			(pack.match.regions?.length ?? 0) > 0
	);
};

const readGlobalPrivacyControl = function readGlobalPrivacyControl():
	| boolean
	| undefined {
	if (typeof navigator === 'undefined') {
		return undefined;
	}
	const value = (navigator as Navigator & { globalPrivacyControl?: unknown })
		.globalPrivacyControl;
	return typeof value === 'boolean' ? value : undefined;
};

const mergeInputs = function mergeInputs(
	base: ResolveInitFromManifestInputs | undefined,
	overrides: Readonly<KernelOverrides>
): ResolveInitFromManifestInputs {
	const language =
		overrides.language ??
		base?.language ??
		(typeof navigator === 'undefined' ? 'en' : navigator.language);
	return {
		country: overrides.country ?? base?.country ?? null,
		gpc: overrides.gpc ?? base?.gpc ?? readGlobalPrivacyControl(),
		language,
		region: overrides.region ?? base?.region ?? null,
	};
};

// Only English ships in the browser bundle; a manifest carries its own
// custom translations for every other language the site serves.
const browserBaseTranslations = {
	en: enTranslations,
} as unknown as BaseTranslations;

/**
 * Resolve `/init` in the browser from the backend's consent manifest.
 *
 * The manifest is the geo-independent half of the backend's decision:
 * policy packs, translations, branding. Inlining it into the page (or
 * fetching it once, cached at the CDN) lets the banner render without a
 * per-visitor `/init` round trip. Saves still go to the backend.
 *
 * When the policy depends on location and no country is known, the
 * transport falls back to `GET /init` so the answer stays faithful.
 *
 * @param options - Manifest source and backend.
 * @returns A transport factory for `mode`.
 * @throws {Error} When neither `manifest` nor `manifestURL` is given.
 *
 * @example
 * ```ts
 * init({
 *   mode: manifest({ manifest: window.__c15tManifest, backendURL: 'https://x.c15t.dev' }),
 * });
 * ```
 */
export const manifest = function manifest(
	options: ManifestModeOptions
): ProviderTransportFactory {
	if (!(options.manifest || options.manifestURL)) {
		throw new Error(
			'@c15t/browser: manifest() needs `manifest` or `manifestURL`.'
		);
	}
	const backendURL = deriveBackendURL(options);
	// `''` is a real answer: a root-relative `manifestURL` such as
	// `/manifest` means the backend is this origin.
	const hosted =
		backendURL === undefined
			? undefined
			: createHostedTransport({ backendURL, fetch: options.fetch });
	let cached: Promise<ConsentManifest> | undefined;

	const fetchManifest =
		async function fetchManifest(): Promise<ConsentManifest> {
			const fetchImpl = options.fetch ?? globalThis.fetch;
			const response = await fetchImpl(options.manifestURL as string, {
				headers: { ...c15tProtocolHeaders },
			});
			if (!response.ok) {
				throw new Error(
					`@c15t/browser: manifest request failed with ${response.status}`
				);
			}
			return (await response.json()) as ConsentManifest;
		};

	const loadManifest = async function loadManifest(): Promise<ConsentManifest> {
		if (options.manifest) {
			return options.manifest;
		}
		cached ??= fetchManifest();
		try {
			return await cached;
		} catch (error) {
			// A failed fetch must not poison every retry.
			cached = undefined;
			throw error;
		}
	};

	const transport: KernelTransport = {
		identify: hosted?.identify,
		async init(ctx: InitContext): Promise<InitResponse> {
			const resolved = await loadManifest();
			const inputs = mergeInputs(options.inputs, ctx.overrides);
			if (
				manifestNeedsLocation(resolved) &&
				(!inputs.country ||
					(!inputs.region &&
						resolved.policyPacks?.some(
							(pack) => (pack.match.regions?.length ?? 0) > 0
						)))
			) {
				if (hosted?.init) {
					return hosted.init(ctx);
				}
				// Resolving without a country would silently hand a visitor the
				// wrong policy; the caller has to supply one or a backend.
				throw new Error(
					'@c15t/browser: this manifest depends on location. Pass `backendURL` so /init can resolve it, or `overrides.country`.'
				);
			}
			const output = resolveInitFromManifest(resolved, inputs, {
				baseTranslations: browserBaseTranslations,
			});
			return mapInitOutputToInitResponse(output, {});
		},
		loadSubjectRecord: hosted?.loadSubjectRecord,
		recordPrivacyOptOut: hosted?.recordPrivacyOptOut,
		save: hosted?.save,
	};

	return Object.assign(() => transport, { kind: 'custom' as const });
};
