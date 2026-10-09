import {
	c15tProtocolHeaders,
	createHostedTransport,
	createUnreportedJourneys,
	earlyInitModes,
	mapInitOutputToInitResponse,
} from '@c15t/core';
import type {
	EarlyInitMode,
	InitContext,
	InitResponse,
	KernelOverrides,
	KernelTransport,
	ProviderTransportFactory,
} from '@c15t/core';
import type {
	ConsentManifest,
	InitOutput,
	PolicyResolution,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';
import {
	resolveInitFromManifest,
	resolvePolicyResolutionFromManifest,
} from '@c15t/schema/types';
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
	 * policy depends on a location the browser does not know. Derived only
	 * from a `manifestURL` ending in `/manifest`. Required for other URLs
	 * and inline-only manifests. Use `''` for this origin.
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

/** Whether any pack is keyed by country or region. */
const hasLocationMatchers = function hasLocationMatchers(
	manifest: ConsentManifest
): boolean {
	return (manifest.policyPacks ?? []).some(
		(pack) =>
			(pack.match.countries?.length ?? 0) > 0 ||
			(pack.match.regions?.length ?? 0) > 0
	);
};

/** Stands in for a region no pack lists. Never a real subdivision code. */
const UNLISTED_REGION = '?';

/**
 * One location for every way the matcher can treat a visitor: unknown,
 * an unlisted country, and each listed country with its listed regions,
 * an unlisted region and no region. Any location resolves the same way as
 * one of these, so their outcomes are every outcome the manifest has.
 */
const representativeLocations = function representativeLocations(
	manifest: ConsentManifest
): { countryCode: string | null; regionCode: string | null }[] {
	const countries = new Set<string>();
	const locations: { countryCode: string | null; regionCode: string | null }[] =
		[{ countryCode: null, regionCode: null }];
	for (const { match } of manifest.policyPacks ?? []) {
		for (const country of [
			...(match.countries ?? []),
			...(match.regionFallbacks ?? []),
		]) {
			countries.add(country.trim().toUpperCase());
		}
		for (const { country, region } of match.regions ?? []) {
			countries.add(country.trim().toUpperCase());
			locations.push({ countryCode: country, regionCode: region });
		}
	}
	for (const country of countries) {
		locations.push(
			{ countryCode: country, regionCode: null },
			{ countryCode: country, regionCode: UNLISTED_REGION }
		);
	}
	// `ZZ` is a user-assigned ISO code no real visitor has. The matcher
	// takes any string, so lengthen it until the manifest does not list it.
	let unlisted = 'ZZ';
	while (countries.has(unlisted)) {
		unlisted += 'Z';
	}
	locations.push({ countryCode: unlisted, regionCode: null });
	return locations;
};

type MatchedResolution = Extract<PolicyResolution, { status: 'matched' }>;

/**
 * What a visitor experiences under a resolution: the behavior the
 * fingerprints hash (model, prompt, scope, defaults, validity, GPC
 * handling, copy revision) plus the message profile, which changes the
 * banner's copy. The policy id is left out on purpose: two packs with the
 * same behavior show the same banner.
 */
const experienceKey = function experienceKey(
	resolution: MatchedResolution
): string {
	const { fingerprints, policy } = resolution;
	return JSON.stringify([
		fingerprints.policy,
		fingerprints.choice,
		fingerprints.notice,
		fingerprints.legacyMaterial ?? null,
		policy.i18n ?? null,
	]);
};

const locationFreeOutcomes = new WeakMap<
	ConsentManifest,
	MatchedResolution | null
>();

/**
 * The resolution every location gives this manifest, when they all give
 * the same experience; `null` when any two differ or any location fails
 * to match. Computed once per manifest object.
 */
const locationFreeOutcome = function locationFreeOutcome(
	manifest: ConsentManifest
): MatchedResolution | null {
	if (locationFreeOutcomes.has(manifest)) {
		return locationFreeOutcomes.get(manifest) ?? null;
	}
	let outcome: MatchedResolution | null = null;
	let key: string | undefined;
	let locations: ReturnType<typeof representativeLocations> = [];
	try {
		locations = representativeLocations(manifest);
	} catch {
		// Malformed matchers: the resolver fails them too, so ask `/init`.
	}
	for (const location of locations) {
		const resolution = resolvePolicyResolutionFromManifest(manifest, location);
		if (resolution.status !== 'matched') {
			outcome = null;
			break;
		}
		const next = experienceKey(resolution);
		if (key !== undefined && next !== key) {
			outcome = null;
			break;
		}
		key = next;
		outcome = resolution;
	}
	locationFreeOutcomes.set(manifest, outcome);
	return outcome;
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
 * Whether a local resolution gives the copy `/init` would. The browser
 * bundle carries English only. For any other language, `/init` lays the
 * manifest's copy over that language's full base, while a local answer
 * fills the gaps with English and still reports the other language. So
 * only an English answer to an English visitor counts.
 */
const servesSameCopy = function servesSameCopy(
	output: InitOutput,
	requested: string | null | undefined
): boolean {
	const primary = (language: string): string =>
		language.toLowerCase().split(/[-_]/u)[0] ?? '';
	return (
		primary(output.translations.language) === 'en' &&
		primary(requested ?? 'en') === 'en'
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
 * The init the browser can answer from this manifest for these inputs, or
 * `undefined` when it must ask `/init`. Synchronous, so a provider can ask
 * during render whether the first `init()` will send a request.
 */
const localAnswer = function localAnswer(
	resolved: ConsentManifest,
	inputs: ResolveInitFromManifestInputs
): InitOutput | undefined {
	const resolveLocally = () =>
		resolveInitFromManifest(resolved, inputs, {
			baseTranslations: browserBaseTranslations,
		});
	if (
		!hasLocationMatchers(resolved) ||
		(inputs.country &&
			(inputs.region ||
				!resolved.policyPacks?.some(
					(pack) => (pack.match.regions?.length ?? 0) > 0
				)))
	) {
		return resolveLocally();
	}
	// The location is unknown. When every location gives the same banner,
	// the bundle already holds the answer and the banner need not wait for
	// a round trip. IAB needs the vendor list, and a visitor in any language
	// but English would get copy with English gaps, so both still ask `/init`.
	const outcome = locationFreeOutcome(resolved);
	if (!outcome || outcome.policy.model === 'iab') {
		return undefined;
	}
	const local = resolveLocally();
	return servesSameCopy(local, inputs.language) ? local : undefined;
};

/** The options each `manifest()` early-init entry was registered with. */
const earlySettings = new WeakMap<EarlyInitMode, ManifestModeOptions>();

/** Each inline manifest's JSON, built once per object. */
const manifestText = new WeakMap<ConsentManifest, string>();

/**
 * Whether two inline manifests are the same. A manifest built during
 * render is a new object on every render, so equal content counts too.
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
 * Resolve `/init` in the browser from the backend's consent manifest.
 *
 * The manifest is the geo-independent half of the backend's decision:
 * policy packs, translations, branding. Inlining it into the page (or
 * fetching it once, cached at the CDN) lets the banner render without a
 * per-visitor `/init` round trip. Saves still go to the backend.
 *
 * When some locations get a different banner than others and no country
 * is known, the transport falls back to `GET /init` so the answer stays
 * faithful. Packs keyed by location that all give the same banner resolve
 * in the browser (see {@link manifestNeedsLocation}).
 *
 * @param options - Manifest source and backend.
 * @returns A transport factory for `mode`.
 * @throws {Error} When neither `manifest` nor `manifestURL` is given,
 * or a backend cannot be derived and `backendURL` is omitted.
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
	if (backendURL === undefined) {
		throw new Error(
			'@c15t/browser: manifest() needs `backendURL` unless `manifestURL` ends in `/manifest`. Pass the consent API URL, or an empty string for this origin.'
		);
	}
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
		cached ??= fetchManifest();
		try {
			return await cached;
		} catch (error) {
			// A failed fetch must not poison every retry.
			cached = undefined;
			throw error;
		}
	};

	/**
	 * One transport per call: a provider builds a second one to carry an
	 * `/init` it sends during its first render, so their request state and
	 * unreported journeys must not be shared.
	 */
	const createTransport = function createTransport(): KernelTransport {
		// `''` is a real answer: a root-relative `manifestURL` such as
		// `/manifest` or an explicit empty backend means this origin.
		const hosted = createHostedTransport({ backendURL, fetch: options.fetch });
		// A local resolution makes no request, so nothing carries its
		// journey; the saves that follow send none either.
		const unreported = createUnreportedJourneys();
		const initFrom = function initFrom(
			resolved: ConsentManifest,
			ctx: InitContext
		): Promise<InitResponse> {
			const { journey } = ctx;
			const output = localAnswer(
				resolved,
				mergeInputs(options.inputs, ctx.overrides)
			);
			if (!output) {
				unreported.reported(journey);
				return hosted.init(ctx);
			}
			unreported.resolvedLocally(journey);
			return Promise.resolve(mapInitOutputToInitResponse(output, {}));
		};
		return {
			identify: hosted.identify,
			init(ctx: InitContext): Promise<InitResponse> {
				// An inlined manifest decides synchronously, so an `/init` it
				// needs leaves within this call: a provider that calls it
				// during render gets the request out at that moment.
				if (options.manifest) {
					try {
						return initFrom(options.manifest, ctx);
					} catch (error) {
						return Promise.reject(error);
					}
				}
				return loadManifest().then((resolved) => initFrom(resolved, ctx));
			},
			loadSubjectRecord: hosted.loadSubjectRecord,
			save: (payload) => hosted.save(unreported.strip(payload)),
		};
	};

	const mode = Object.assign(createTransport, { kind: 'custom' as const });
	const settings: ManifestModeOptions = {
		...options,
		inputs: options.inputs && { ...options.inputs },
	};
	const early: EarlyInitMode = {
		// Only an inlined manifest can tell without a request.
		requestsInit: (overrides) =>
			settings.manifest !== undefined &&
			localAnswer(
				settings.manifest,
				mergeInputs(settings.inputs, overrides)
			) === undefined,
		sameAs: (other) => {
			const theirs = earlySettings.get(other);
			return (
				theirs !== undefined &&
				sameManifest(theirs.manifest, settings.manifest) &&
				theirs.fetch === settings.fetch &&
				theirs.manifestURL === settings.manifestURL &&
				theirs.backendURL === settings.backendURL &&
				JSON.stringify(theirs.inputs) === JSON.stringify(settings.inputs)
			);
		},
	};
	earlySettings.set(early, settings);
	earlyInitModes.set(mode, early);
	return mode;
};
