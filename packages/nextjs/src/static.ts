import {
	createStaticManifestModule as createModule,
	loadStaticManifest as loadManifest,
} from '@c15t/core/server';
import type {
	ConsentManifest,
	InitOutput,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';
import { resolveInitFromManifest } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

export type { ConsentManifest } from '@c15t/schema/types';

export interface StaticManifestModuleOptions {
	manifestURL: string;
	fetch?: typeof globalThis.fetch;
	exportName?: string;
	/** Package entry that supplies the generated ConsentManifest type. */
	importSource?: string;
}

export interface StaticGeoResult {
	country?: string | null;
	countryCode?: string | null;
	region?: string | null;
	regionCode?: string | null;
}

export interface StaticConsentResolverOptions {
	manifest: ConsentManifest;
	geo?: StaticGeoResult | null;
	geoURL?: string;
	language?: string;
	gpc?: boolean;
	fetch?: typeof globalThis.fetch;
}

export interface StaticConsentResolution {
	/**
	 * Synchronous policy outcome for first paint. Unknown geography never
	 * rewrites a configured matcher.
	 */
	initial: InitOutput;

	/**
	 * Resolves to the geo-specific result when `geo` or `geoURL` is available.
	 * Falls back to `initial` when geo cannot be resolved.
	 */
	resolved: Promise<InitOutput>;
}

const readBrowserLanguage = function readBrowserLanguage(): string | undefined {
	if (typeof navigator === 'undefined') {
		return undefined;
	}
	return navigator.languages?.[0] ?? navigator.language;
};

const readBrowserGpc = function readBrowserGpc(): boolean | undefined {
	if (typeof navigator === 'undefined') {
		return undefined;
	}
	return (
		(navigator as Navigator & { globalPrivacyControl?: unknown })
			.globalPrivacyControl === true
	);
};

const normalizeGeo = function normalizeGeo(
	geo: StaticGeoResult | null | undefined
): ResolveInitFromManifestInputs {
	return {
		country: geo?.country ?? geo?.countryCode ?? undefined,
		region: geo?.region ?? geo?.regionCode ?? undefined,
	};
};

/** Resolve unknown geography without rewriting configured policy matchers. */
export const resolveStrictestDefaultInit = function resolveStrictestDefaultInit(
	manifest: ConsentManifest,
	inputs: Omit<ResolveInitFromManifestInputs, 'country' | 'region'> = {}
): InitOutput {
	return resolveInitFromManifest(
		manifest,
		{ ...inputs, country: null, region: null },
		{ baseTranslations }
	);
};

const fetchStaticGeo = async function fetchStaticGeo(
	geoURL: string,
	fetchImpl: typeof globalThis.fetch
): Promise<StaticGeoResult | null> {
	const response = await fetchImpl(geoURL, {
		headers: { accept: 'application/json' },
		method: 'GET',
	});
	if (!response.ok) {
		return null;
	}
	return (await response.json()) as StaticGeoResult;
};

export const createStaticConsentResolver = function createStaticConsentResolver(
	options: StaticConsentResolverOptions
): StaticConsentResolution {
	const language = options.language ?? readBrowserLanguage() ?? 'en';
	const gpc = options.gpc ?? readBrowserGpc();
	const commonInputs = { gpc, language };
	const initialGeo = normalizeGeo(options.geo);
	const hasGeo = Boolean(initialGeo.country || initialGeo.region);
	const initial = hasGeo
		? resolveInitFromManifest(
				options.manifest,
				{
					...commonInputs,
					...initialGeo,
				},
				{ baseTranslations }
			)
		: resolveStrictestDefaultInit(options.manifest, commonInputs);

	return {
		initial,
		resolved: (async () => {
			if (hasGeo) {
				return initial;
			}
			if (!options.geoURL) {
				return initial;
			}
			const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
			if (!fetchImpl) {
				return initial;
			}
			const geo = await fetchStaticGeo(options.geoURL, fetchImpl).catch(
				() => null
			);
			const resolvedGeo = normalizeGeo(geo);
			if (!resolvedGeo.country && !resolvedGeo.region) {
				return initial;
			}
			return resolveInitFromManifest(
				options.manifest,
				{
					...commonInputs,
					...resolvedGeo,
				},
				{ baseTranslations }
			);
		})(),
	};
};

/** Fetches the manifest used by static builds. */
export const loadStaticManifest = (
	options: Omit<StaticManifestModuleOptions, 'exportName'>
): Promise<ConsentManifest> => loadManifest(options, '@c15t/nextjs/static');

/** Generates a typed manifest module for a static build. */
export const createStaticManifestModule = (
	options: StaticManifestModuleOptions
): Promise<string> =>
	createModule(options, {
		importSource: '@c15t/nextjs/static',
		label: '@c15t/nextjs/static',
	});
