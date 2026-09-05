import { c15tProtocolHeaders } from '@c15t/core';
import type {
	ConsentManifest,
	InitOutput,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';
import { resolveInitFromManifest } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

export interface StaticManifestModuleOptions {
	manifestURL: string;
	fetch?: typeof globalThis.fetch;
	exportName?: string;
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

export const loadStaticManifest = async function loadStaticManifest(
	options: Omit<StaticManifestModuleOptions, 'exportName'>
): Promise<ConsentManifest> {
	const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error('@c15t/nextjs/static: no fetch available.');
	}
	const response = await fetchImpl(options.manifestURL, {
		headers: { accept: 'application/json', ...c15tProtocolHeaders },
		method: 'GET',
	});
	if (!response.ok) {
		throw new Error(
			`@c15t/nextjs/static: /manifest responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as ConsentManifest;
};

/**
 * Build-time helper for `output: "export"` apps.
 *
 * Call this from a build script and write the returned TypeScript source to a
 * module imported by the client app.
 */
export const createStaticManifestModule =
	async function createStaticManifestModule(
		options: StaticManifestModuleOptions
	): Promise<string> {
		const exportName = options.exportName ?? 'consentManifest';
		const manifest = await loadStaticManifest(options);
		return [
			"import type { ConsentManifest } from '@c15t/schema/types';",
			'',
			`export const ${exportName} = ${JSON.stringify(
				manifest,
				null,
				2
			)} as const satisfies ConsentManifest;`,
			'',
		].join('\n');
	};
