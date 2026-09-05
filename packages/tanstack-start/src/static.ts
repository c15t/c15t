import type {
	ConsentManifest,
	ConsentManifestPolicyPack,
	InitOutput,
	ResolveInitFromManifestInputs,
} from '@c15t/schema/types';
import { resolveInitFromManifest } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

/** The manifest shape generated static modules are typed against. */
export type { ConsentManifest } from '@c15t/schema/types';

/** Names that parse but cannot be bound with `export const`. */
const RESERVED_EXPORT_NAMES = new Set([
	'arguments',
	'await',
	'break',
	'case',
	'catch',
	'class',
	'const',
	'continue',
	'debugger',
	'default',
	'delete',
	'do',
	'else',
	'enum',
	'eval',
	'export',
	'extends',
	'false',
	'finally',
	'for',
	'function',
	'if',
	'implements',
	'import',
	'in',
	'instanceof',
	'interface',
	'let',
	'new',
	'null',
	'package',
	'private',
	'protected',
	'public',
	'return',
	'static',
	'super',
	'switch',
	'this',
	'throw',
	'true',
	'try',
	'typeof',
	'var',
	'void',
	'while',
	'with',
	'yield',
]);

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
	 * Safe synchronous result for first paint. Uses the strictest known policy
	 * when geo has not been resolved yet.
	 */
	initial: InitOutput;

	/**
	 * Resolves to the geo-specific result when `geo` or `geoURL` is available.
	 * Falls back to `initial` when geo cannot be resolved.
	 */
	resolved: Promise<InitOutput>;
}

const POLICY_STRICTNESS: Record<string, number> = {
	iab: 4,
	none: 0,
	notice: 1,
	'opt-in': 3,
	'opt-out': 2,
};

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
	return (navigator as Navigator & { globalPrivacyControl?: boolean })
		.globalPrivacyControl;
};

const normalizeGeo = function normalizeGeo(
	geo: StaticGeoResult | null | undefined
): ResolveInitFromManifestInputs {
	return {
		country: geo?.country ?? geo?.countryCode ?? undefined,
		region: geo?.region ?? geo?.regionCode ?? undefined,
	};
};

const comparePolicyStrictness = function comparePolicyStrictness(
	left: ConsentManifestPolicyPack,
	right: ConsentManifestPolicyPack
) {
	const leftScore = POLICY_STRICTNESS[left.resolvedPolicy.model] ?? -1;
	const rightScore = POLICY_STRICTNESS[right.resolvedPolicy.model] ?? -1;
	return leftScore - rightScore;
};

const pickStrictestPolicyPack = function pickStrictestPolicyPack(
	manifest: ConsentManifest
): ConsentManifestPolicyPack | undefined {
	const sorted = manifest.policyPacks?.slice().sort(comparePolicyStrictness);
	return sorted?.[sorted.length - 1];
};

export const resolveStrictestDefaultInit = function resolveStrictestDefaultInit(
	manifest: ConsentManifest,
	inputs: Omit<ResolveInitFromManifestInputs, 'country' | 'region'> = {}
): InitOutput {
	const strictestPack = pickStrictestPolicyPack(manifest);
	if (!strictestPack) {
		return resolveInitFromManifest(
			manifest,
			{
				...inputs,
				country: null,
				region: null,
			},
			{ baseTranslations }
		);
	}

	return resolveInitFromManifest(
		{
			...manifest,
			policyPacks: [
				{
					...strictestPack,
					policy: {
						...strictestPack.policy,
						match: { fallback: true },
					},
				},
			],
		},
		{
			...inputs,
			country: null,
			region: null,
		},
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
		throw new Error('@c15t/tanstack-start/static: no fetch available.');
	}
	const response = await fetchImpl(options.manifestURL, {
		headers: { accept: 'application/json' },
		method: 'GET',
	});
	if (!response.ok) {
		throw new Error(
			`@c15t/tanstack-start/static: /manifest responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as ConsentManifest;
};

/**
 * Build-time helper for prerendered and static builds.
 *
 * Call this from a build script and write the returned TypeScript source to a
 * module imported by the client app.
 */
export const createStaticManifestModule =
	async function createStaticManifestModule(
		options: StaticManifestModuleOptions
	): Promise<string> {
		const exportName = options.exportName ?? 'consentManifest';
		if (
			!/^[A-Za-z_$][\w$]*$/u.test(exportName) ||
			RESERVED_EXPORT_NAMES.has(exportName)
		) {
			throw new Error(
				`@c15t/tanstack-start/static: exportName must be a valid identifier, received ${JSON.stringify(exportName)}.`
			);
		}
		const manifest = await loadStaticManifest(options);
		return [
			// Import from this package's own entry so the generated file resolves
			// under strict dependency layouts (pnpm) where the app does not
			// declare @c15t/schema itself.
			"import type { ConsentManifest } from '@c15t/tanstack-start/static';",
			'',
			`export const ${exportName} = ${JSON.stringify(
				manifest,
				null,
				2
			)} as const satisfies ConsentManifest;`,
			'',
		].join('\n');
	};
