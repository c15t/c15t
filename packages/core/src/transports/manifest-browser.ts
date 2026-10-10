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
import { earlyInitModes } from './early-init-modes';
import type { EarlyInitMode } from './early-init-modes';
import { createHostedTransport } from './hosted';
import type { TransportInitResponse } from './init-output';
import { locationFreeOutcome } from './manifest-browser-location';
import {
	hasLocationMatchers,
	mayBeLocationFree,
} from './manifest-browser-packs';
import type * as RemoteModule from './manifest-browser-remote';
import type * as ResolveModule from './manifest-browser-resolve';
import type {
	ProviderTransportContext,
	ProviderTransportFactory,
} from './mode';

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
 * A manifest without country or region packs resolves the same everywhere,
 * so the browser can do it without a round trip. So does one whose packs
 * are keyed by location but all give the same experience, for example
 * opt-in with the same categories and copy in Europe, Quebec and everywhere
 * else: only the policy id differs. A manifest where some location gets a
 * different banner, or none, or matches no pack, needs a location.
 *
 * @param manifest - The manifest.
 * @returns `true` when a country is required for a faithful answer.
 */
export const manifestNeedsLocation = function manifestNeedsLocation(
	manifest: ConsentManifest
): boolean {
	return (
		hasLocationMatchers(manifest) && locationFreeOutcome(manifest) === null
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
	if (!hasLocationMatchers(resolved)) {
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

/**
 * Whether IAB GPP is on the page: the `__gpp` stub or API is installed.
 * Another CMP's `__gpp` counts too; it only costs a request.
 */
const gppOnPage = (): boolean =>
	typeof window !== 'undefined' &&
	typeof (window as Window & { __gpp?: unknown }).__gpp === 'function';

/**
 * Whether `init()` for these inputs asks the backend's `/init`, decided
 * without loading anything: `true` asks it at once, `false` resolves in
 * the browser, `undefined` leaves it to the resolver chunk, which knows
 * whether every location gets the same banner, and to `geoURL`.
 *
 * GPP asks `/init`: its US sections need the country an answer for an
 * unknown location does not report. So does IAB, whose vendor list the
 * backend supplies.
 */
const asksInit = function asksInit(
	resolved: ConsentManifest,
	inputs: ResolveInitFromManifestInputs,
	options: Pick<BrowserManifestOptions, 'geoURL' | 'initFallback'>,
	gpp: boolean
): boolean | undefined {
	if (!lacksLocation(resolved, inputs) || options.initFallback === false) {
		return false;
	}
	if (options.geoURL) {
		return undefined;
	}
	return (
		gpp ||
		resolved.iab?.enabled === true ||
		!mayBeLocationFree(resolved) ||
		undefined
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
 * What every transport one {@link manifest} builds shares: the manifest,
 * the visitor's location from `geoURL` and the lazily loaded modules, each
 * loaded once per page.
 */
interface ManifestSource {
	backendURL: string;
	getFetch: () => typeof globalThis.fetch;
	loadGeo: (geoURL: string) => Promise<ManifestModeInputs | undefined>;
	loadManifest: () => Promise<ConsentManifest>;
	loadResolver: () => Promise<typeof ResolveModule>;
}

/**
 * Check the options and start loading what the first `init()` will need.
 *
 * @throws {Error} When none of `snapshot`, `manifestURL` and `backendURL`
 * is given, or a backend can't be derived and `backendURL` is omitted.
 */
const createManifestSource = function createManifestSource(
	options: BrowserManifestOptions
): ManifestSource {
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
	const loadResolver = async () => {
		resolver ??= import('./manifest-browser-resolve');
		try {
			return await resolver;
		} catch (error) {
			resolver = undefined;
			throw error;
		}
	};
	// A policy that needs a location the page can't supply goes to the
	// backend's `/init`, so the resolver loads only when a local answer
	// is likely, and then as soon as possible.
	const { snapshot } = options;
	if (
		!snapshot ||
		!hasLocationMatchers(snapshot) ||
		mayBeLocationFree(snapshot) ||
		options.inputs?.country ||
		options.geoURL
	) {
		preload(loadResolver);
	}

	return {
		backendURL,
		getFetch,
		/** The visitor's location from `geoURL`, asked once per page. */
		loadGeo(geoURL) {
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
		},
		async loadManifest() {
			if (snapshot) {
				return snapshot;
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
		},
		loadResolver,
	};
};

/**
 * One transport over a shared {@link ManifestSource}. Each has its own
 * hosted transport and unreported journeys: a provider builds a second
 * transport to carry an `/init` it sends during its first render.
 */
const transportFrom = function transportFrom(
	options: BrowserManifestOptions,
	source: ManifestSource,
	context: Pick<ProviderTransportContext, 'gppEnabled'> | undefined
): KernelTransport {
	// `''` is a real answer: a root-relative `manifestURL` such as
	// `/manifest` or an explicit empty backend means this origin.
	const hosted = createHostedTransport({
		backendURL: source.backendURL,
		domain: options.domain,
		fetch: options.fetch,
		headers: options.headers,
	});
	// A local resolution makes no request, so nothing carries its
	// journey; the saves that follow send none either.
	const unreported = createUnreportedJourneys();
	const gpp = () => context?.gppEnabled === true || gppOnPage();
	const ask = (ctx: InitContext): Promise<TransportInitResponse> => {
		unreported.reported(ctx.journey);
		return hosted.init(ctx);
	};
	const answer = async (
		resolved: ConsentManifest,
		inputs: ResolveInitFromManifestInputs,
		ctx: InitContext
	): Promise<TransportInitResponse> => {
		unreported.resolvedLocally(ctx.journey);
		const { resolveLocally } = await source.loadResolver();
		return resolveLocally(resolved, inputs, source.getFetch());
	};
	const initFrom = async (
		resolved: ConsentManifest,
		ctx: InitContext
	): Promise<TransportInitResponse> => {
		let inputs = mergeInputs(options.inputs, undefined, ctx.overrides);
		const asks = asksInit(resolved, inputs, options, gpp());
		if (asks !== undefined) {
			return asks ? ask(ctx) : answer(resolved, inputs, ctx);
		}
		// The location is unknown. When every location gets the same banner,
		// the bundle already holds the answer and the banner need not wait
		// for a round trip. GPP and IAB still need the backend.
		if (
			!resolved.iab?.enabled &&
			mayBeLocationFree(resolved) &&
			(await source.loadResolver()).isLocationFree(resolved) &&
			!gpp()
		) {
			return answer(resolved, inputs, ctx);
		}
		if (options.geoURL) {
			inputs = mergeInputs(
				options.inputs,
				await source.loadGeo(options.geoURL),
				ctx.overrides
			);
			if (!lacksLocation(resolved, inputs)) {
				return answer(resolved, inputs, ctx);
			}
		}
		return ask(ctx);
	};
	return {
		identify: hosted.identify,
		init(ctx: InitContext): Promise<TransportInitResponse> {
			const { snapshot } = options;
			// A snapshot decides synchronously, so an `/init` it needs leaves
			// within this call: a provider that calls it during render gets
			// the request out at that moment.
			if (
				snapshot &&
				asksInit(
					snapshot,
					mergeInputs(options.inputs, undefined, ctx.overrides),
					options,
					gpp()
				)
			) {
				return ask(ctx);
			}
			return source.loadManifest().then((resolved) => initFrom(resolved, ctx));
		},
		loadSubjectRecord: hosted.loadSubjectRecord,
		save: (payload) => hosted.save(unreported.strip(payload)),
	};
};

/**
 * Build a transport that resolves `/init` in the browser from a consent
 * manifest and saves to the backend.
 *
 * When some locations get a different banner than others and the browser
 * doesn't know where the visitor is, it asks `geoURL` first, then falls
 * back to the backend's `GET /init` so the answer stays faithful. Packs
 * keyed by location that all give the same banner resolve in the browser
 * (see {@link manifestNeedsLocation}), unless IAB GPP is on the page or
 * the runtime: its US sections need the visitor's country, and an answer
 * for an unknown location reports none.
 *
 * @param options - Manifest source and backend.
 * @param context - The provider's transport context, for `gppEnabled`.
 * @returns A kernel transport.
 * @throws {Error} When none of `snapshot`, `manifestURL` and `backendURL`
 * is given, or a backend can't be derived and `backendURL` is omitted.
 */
export const createBrowserManifestTransport =
	function createBrowserManifestTransport(
		options: BrowserManifestOptions,
		context?: Pick<ProviderTransportContext, 'gppEnabled'>
	): KernelTransport {
		return transportFrom(options, createManifestSource(options), context);
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
 * @returns A transport factory for `mode`, carrying its options. Each call
 * builds a transport of its own over one shared manifest.
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
	const source = createManifestSource(settings);
	return Object.assign(
		(context?: ProviderTransportContext) =>
			transportFrom(settings, source, context),
		settings,
		{
			kind: 'manifest' as const,
			type: 'manifest' as const,
		}
	);
};

/** The settings of each `manifest()` that {@link withEarlyInit} registered. */
const earlySettings = new WeakMap<EarlyInitMode, BrowserManifestOptions>();

/** Each snapshot's JSON, built once per object. */
const manifestText = new WeakMap<ConsentManifest, string>();

/**
 * Whether two snapshots are the same. A snapshot built during render is a
 * new object on every render, so equal content counts too.
 */
const sameManifest = function sameManifest(
	a: ConsentManifest | undefined,
	b: ConsentManifest | undefined
): boolean {
	if (a === b) {
		return true;
	}
	if (!a || !b || a.revision !== b.revision) {
		return false;
	}
	const text = (value: ConsentManifest) => {
		let json = manifestText.get(value);
		if (json === undefined) {
			json = JSON.stringify(value);
			manifestText.set(value, json);
		}
		return json;
	};
	return text(a) === text(b);
};

/**
 * Let a provider send this mode's first `/init` during its first render,
 * as it does for `hosted()`. It does so only when the snapshot can't
 * answer for the location the render knows. A mode without a snapshot
 * can't tell before its manifest request, so it never sends early.
 *
 * @param mode - A factory from {@link manifest}.
 * @returns The same factory, registered in `earlyInitModes`.
 * @internal
 */
export const withEarlyInit = function withEarlyInit(
	mode: BrowserManifestModeFactory
): BrowserManifestModeFactory {
	const settings: BrowserManifestOptions = {
		...mode,
		inputs: mode.inputs && { ...mode.inputs },
	} as BrowserManifestOptions;
	const early: EarlyInitMode = {
		requestsInit: (overrides) =>
			settings.snapshot !== undefined &&
			asksInit(
				settings.snapshot,
				mergeInputs(settings.inputs, undefined, overrides),
				settings,
				gppOnPage()
			) === true,
		sameAs: (other) => {
			const theirs = earlySettings.get(other);
			const plain = ({
				snapshot: _snapshot,
				...rest
			}: BrowserManifestOptions) => JSON.stringify(rest);
			return (
				theirs !== undefined &&
				theirs.fetch === settings.fetch &&
				sameManifest(theirs.snapshot, settings.snapshot) &&
				plain(theirs) === plain(settings)
			);
		},
	};
	earlySettings.set(early, settings);
	earlyInitModes.set(mode, early);
	return mode;
};
