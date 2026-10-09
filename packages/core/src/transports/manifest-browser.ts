/**
 * `@c15t/core/transports/manifest-browser` — resolve `/init` in the browser
 * from the backend's consent manifest.
 *
 * The manifest is the location-independent half of the backend's decision:
 * policy packs, translations, branding. With it the browser can render the
 * banner without a per-visitor `/init` round trip. Saves still go to the
 * backend.
 *
 * Only English base copy is bundled. Another language's base copy loads
 * with `import('@c15t/translations/<lang>')` the first time a visitor
 * resolves to it, so each language is its own chunk. A manifest carries the
 * project's own copy for every language it customizes.
 *
 * Server code resolves with `@c15t/core/transports/manifest`, which bundles
 * every language. Never import that module in client code.
 */
import type {
	ConsentManifest,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';

import { createUnreportedJourneys } from '../libs/journey';
import type {
	ManifestModeBaseOptions,
	ManifestModeInputs,
	ManifestModeSourceOptions,
} from '../modes';
import type { InitContext, KernelOverrides, KernelTransport } from '../types';
import { createHostedTransport } from './hosted';
import type { TransportInitResponse } from './init-output';
import type * as RemoteModule from './manifest-browser-remote';
import type * as ResolveModule from './manifest-browser-resolve';
import type { ProviderTransportFactory } from './mode';

/** Options for {@link manifest} and {@link createBrowserManifestTransport}. */
export type BrowserManifestOptions = ManifestModeBaseOptions &
	ManifestModeSourceOptions & {
		/**
		 * Backend origin for `POST /subjects`, and for `GET /init` when the
		 * policy depends on a location the browser doesn't know. Derived from
		 * a `manifestURL` ending in `/manifest`. Required for other URLs and
		 * for a `snapshot` without `manifestURL`. Use `''` for this origin.
		 */
		backendURL?: string;
		/** Fetch implementation. Defaults to `globalThis.fetch`. */
		fetch?: typeof globalThis.fetch;
		/** Headers sent with the manifest request and the `/init` fallback. */
		headers?: Record<string, string>;
		/** Fetch credentials mode for the manifest request. */
		credentials?: RequestCredentials;
		/** Domain sent to `POST /subjects`. Defaults to the page's hostname. */
		domain?: string;
		/**
		 * Ask the backend's `GET /init` when the policy depends on a location
		 * neither the inputs, the overrides nor `geoURL` supplied. With
		 * `false`, the manifest resolves for an unknown location instead.
		 *
		 * @defaultValue true
		 */
		initFallback?: boolean;
	};

/**
 * What {@link manifest} returns: a transport factory that also carries its
 * options as enumerable data, so it satisfies `ManifestMode` from
 * `@c15t/core/modes`.
 */
export type BrowserManifestModeFactory = ProviderTransportFactory &
	Readonly<BrowserManifestOptions> & {
		readonly kind: 'manifest';
		readonly type: 'manifest';
	};

export type { OtherLanguage } from './manifest-browser-resolve';

const trimSlash = function trimSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
};

const deriveBackendURL = function deriveBackendURL(
	options: BrowserManifestOptions
): string | undefined {
	if (options.backendURL !== undefined) {
		return trimSlash(options.backendURL);
	}
	if (!options.manifestURL) {
		return undefined;
	}
	const withoutQuery =
		options.manifestURL.split(/[?#]/u)[0] ?? options.manifestURL;
	const trimmed = trimSlash(withoutQuery);
	if (!trimmed.endsWith('/manifest')) {
		return undefined;
	}
	try {
		// Parse relative URLs too, without mistaking a host named "manifest"
		// for the endpoint. The base is only used to inspect the pathname.
		const parsed = new URL(trimmed, 'https://c15t.invalid');
		if (
			!['http:', 'https:'].includes(parsed.protocol) ||
			!parsed.pathname.endsWith('/manifest')
		) {
			return undefined;
		}
	} catch {
		return undefined;
	}
	return trimmed.slice(0, -'/manifest'.length);
};

/**
 * Whether resolving this manifest needs to know where the visitor is.
 *
 * A manifest whose packs all match by default or fallback — "one banner
 * for everyone" — resolves the same everywhere, so the browser can do it
 * without a round trip. So does a manifest without packs, which resolves
 * to `unconfigured` or `no-match` wherever the visitor is. Anything keyed by
 * country or region needs a location.
 *
 * @param manifest - The manifest.
 * @returns `true` when a country is required for a faithful answer.
 */
export const manifestNeedsLocation = function manifestNeedsLocation(
	manifest: ConsentManifest
): boolean {
	return (manifest.policyPacks ?? []).some(
		(pack) =>
			(pack.match.countries?.length ?? 0) > 0 ||
			(pack.match.regions?.length ?? 0) > 0 ||
			(pack.match.regionFallbacks?.length ?? 0) > 0
	);
};

/**
 * Whether the inputs lack a location this manifest needs: no country, or no
 * region for a country some pack splits by region.
 */
const lacksLocation = function lacksLocation(
	resolved: ConsentManifest,
	inputs: ResolveInitFromManifestInputs
): boolean {
	if (!manifestNeedsLocation(resolved)) {
		return false;
	}
	const country = inputs.country?.toUpperCase();
	if (!country) {
		return true;
	}
	if (inputs.region) {
		return false;
	}
	return (resolved.policyPacks ?? []).some((pack) =>
		pack.match.regions?.some(
			(region) => region.country.toUpperCase() === country
		)
	);
};

const readGlobalPrivacyControl = function readGlobalPrivacyControl():
	| boolean
	| undefined {
	if (typeof navigator === 'undefined') {
		return undefined;
	}
	try {
		const value = (navigator as Navigator & { globalPrivacyControl?: unknown })
			.globalPrivacyControl;
		return typeof value === 'boolean' ? value : undefined;
	} catch {
		return undefined;
	}
};

const mergeInputs = function mergeInputs(
	base: ManifestModeInputs | undefined,
	geo: ManifestModeInputs | undefined,
	overrides: Readonly<KernelOverrides>
): ResolveInitFromManifestInputs {
	const language =
		overrides.language ??
		(typeof navigator === 'undefined' ? 'en' : navigator.language);
	return {
		country: overrides.country ?? base?.country ?? geo?.country ?? null,
		gpc: overrides.gpc ?? readGlobalPrivacyControl(),
		language,
		region: overrides.region ?? base?.region ?? geo?.region ?? null,
	};
};

/**
 * Build a transport that resolves `/init` in the browser from a consent
 * manifest and saves to the backend.
 *
 * When the policy depends on a location the browser doesn't know, it asks
 * `geoURL` first, then falls back to the backend's `GET /init` so the
 * answer stays faithful.
 *
 * @param options - Manifest source and backend.
 * @returns A kernel transport.
 * @throws {Error} When none of `snapshot`, `manifestURL` and `backendURL`
 * is given, or a backend can't be derived and `backendURL` is omitted.
 */
export const createBrowserManifestTransport =
	function createBrowserManifestTransport(
		options: BrowserManifestOptions
	): KernelTransport {
		const backendURL = deriveBackendURL(options);
		// Without a snapshot or a `manifestURL`, read the backend's own
		// `/manifest`. A build that could not fetch the snapshot passes
		// `snapshot: undefined`, and the page still gets its policy.
		const manifestURL =
			options.manifestURL ??
			(options.snapshot || backendURL === undefined
				? undefined
				: `${backendURL}/manifest`);
		if (!(options.snapshot || manifestURL)) {
			throw new Error(
				'c15t: manifest() needs `snapshot`, `manifestURL` or `backendURL`.'
			);
		}
		if (backendURL === undefined) {
			throw new Error(
				'c15t: manifest() needs `backendURL` unless `manifestURL` ends in `/manifest`. Pass the consent API URL, or an empty string for this origin.'
			);
		}
		// `''` is a real answer: a root-relative `manifestURL` such as
		// `/manifest` or an explicit empty backend means this origin.
		const hosted = createHostedTransport({
			backendURL,
			domain: options.domain,
			fetch: options.fetch,
			headers: options.headers,
		});
		const getFetch = (): typeof globalThis.fetch =>
			options.fetch ?? globalThis.fetch.bind(globalThis);
		let cachedManifest: Promise<ConsentManifest> | undefined;
		let cachedGeo: Promise<ManifestModeInputs | undefined> | undefined;

		// The network code loads on demand. Without a snapshot the transport
		// needs it on every page, so start loading it now.
		let remote: Promise<typeof RemoteModule> | undefined;
		const loadRemote = () => {
			remote ??= import('./manifest-browser-remote');
			return remote;
		};
		// Start a load early; a failure surfaces when init awaits it.
		const preload = async (load: () => Promise<unknown>) => {
			try {
				await load();
			} catch {
				// Retried by the call that needs the module.
			}
		};
		if (!options.snapshot) {
			preload(loadRemote);
		}
		let resolver: Promise<typeof ResolveModule> | undefined;
		const loadResolver = () => {
			resolver ??= import('./manifest-browser-resolve');
			return resolver;
		};
		// A policy that needs a location the page can't supply goes to the
		// backend's `/init`, so the resolver loads only when a local answer
		// is likely, and then as soon as possible.
		if (
			!options.snapshot ||
			!manifestNeedsLocation(options.snapshot) ||
			options.inputs?.country ||
			options.geoURL
		) {
			preload(loadResolver);
		}

		const loadManifest =
			async function loadManifest(): Promise<ConsentManifest> {
				if (options.snapshot) {
					return options.snapshot;
				}
				cachedManifest ??= (async () => {
					const remoteModule = await loadRemote();
					return remoteModule.fetchManifest(manifestURL as string, getFetch(), {
						credentials: options.credentials,
						headers: options.headers,
					});
				})();
				try {
					return await cachedManifest;
				} catch (error) {
					// A failed fetch must not poison every retry.
					cachedManifest = undefined;
					remote = undefined;
					throw error;
				}
			};

		/** The visitor's location from `geoURL`, asked once per page. */
		const loadGeo = function loadGeo(
			geoURL: string
		): Promise<ManifestModeInputs | undefined> {
			// Without a location the `/init` fallback still answers.
			cachedGeo ??= (async () => {
				try {
					const remoteModule = await loadRemote();
					return await remoteModule.fetchGeoInputs(geoURL, getFetch());
				} catch {
					return undefined;
				}
			})();
			return cachedGeo;
		};

		// A local resolution makes no request, so nothing carries its
		// journey; the saves that follow send none either.
		const unreported = createUnreportedJourneys();
		return {
			identify: hosted.identify,
			async init(ctx: InitContext): Promise<TransportInitResponse> {
				const resolved = await loadManifest();
				const { journey } = ctx;
				let inputs = mergeInputs(options.inputs, undefined, ctx.overrides);
				if (lacksLocation(resolved, inputs) && options.geoURL) {
					inputs = mergeInputs(
						options.inputs,
						await loadGeo(options.geoURL),
						ctx.overrides
					);
				}
				if (lacksLocation(resolved, inputs) && options.initFallback !== false) {
					unreported.reported(journey);
					return hosted.init(ctx);
				}
				unreported.resolvedLocally(journey);
				try {
					const { resolveLocally } = await loadResolver();
					return await resolveLocally(resolved, inputs, getFetch());
				} catch (error) {
					resolver = undefined;
					throw error;
				}
			},
			loadSubjectRecord: hosted.loadSubjectRecord,
			save: (payload) => hosted.save(unreported.strip(payload)),
		};
	};

/**
 * Resolve init in the browser from the backend's consent manifest.
 *
 * The single-page app `manifest()`: React, the Vue plugin, Svelte and
 * `@c15t/browser` re-export it. It always resolves in the browser, so it
 * has no `resolve` option. Server-framework packages take the data
 * `manifest()` from `@c15t/core/modes` instead.
 *
 * @param options - Manifest source and backend.
 * @returns A transport factory for `mode`, carrying its options.
 * @throws {Error} When none of `snapshot`, `manifestURL` and `backendURL`
 * is given, or a backend can't be derived and `backendURL` is omitted.
 * @example
 * ```ts
 * import { manifest } from '@c15t/core/transports/manifest-browser';
 *
 * const mode = manifest({ backendURL: 'https://your-project.inth.app' });
 * ```
 */
export const manifest = function manifest(
	options: BrowserManifestOptions
): BrowserManifestModeFactory {
	const settings = { ...options } as BrowserManifestOptions;
	const transport = createBrowserManifestTransport(settings);
	return Object.assign(() => transport, settings, {
		kind: 'manifest' as const,
		type: 'manifest' as const,
	});
};
