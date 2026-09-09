import {
	createEvaluationPolicy,
	evaluateConsentRecord,
} from '@c15t/core/consent-record';
import {
	createStaticManifestModule as createModule,
	loadStaticManifest as loadManifest,
} from '@c15t/core/server';
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

export interface StaticManifestModuleOptions {
	manifestURL: string;
	fetch?: typeof globalThis.fetch;
	exportName?: string;
	/**
	 * Module the generated file imports its `ConsentManifest` type from.
	 * Use the entry the application itself depends on, so the import
	 * resolves under strict dependency layouts (pnpm): apps that install
	 * the umbrella package pass `'c15t/tanstack-start/static'`.
	 *
	 * @default '@c15t/tanstack-start/static'
	 */
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

/** Tie-breakers after effective permission counts. */
const scoreScope = (pack: ConsentManifestPolicyPack) =>
	(pack.rule.scopeMode === 'strict' ? 2 : 0) +
	(pack.rule.privacySignals.gpc.denyCategories.length > 0 ? 1 : 0);

const countPreConsentGrants = (
	pack: ConsentManifestPolicyPack,
	gpc: boolean | undefined
): number => {
	const { rule } = pack;
	const policy = createEvaluationPolicy({
		choice: {
			fingerprint: pack.fingerprints.choice,
			maxAgeMs: rule.validity.choiceMs,
		},
		gpcDenyCategories: rule.privacySignals.gpc.denyCategories,
		model: rule.model,
		notice: {
			fingerprint: pack.fingerprints.notice,
			maxAgeMs: rule.validity.noticeMs,
		},
		prompt: rule.prompt,
		scope: rule.scope,
		scopeMode: rule.scopeMode,
	});
	const evaluation = evaluateConsentRecord({
		choice: null,
		gpc,
		noticeDismissal: null,
		now: 0,
		policy,
	});
	return Object.values(evaluation.permissions).filter(Boolean).length;
};

const comparePolicyStrictness = function comparePolicyStrictness(
	left: ConsentManifestPolicyPack,
	right: ConsentManifestPolicyPack,
	gpc: boolean | undefined
) {
	const leftScore = POLICY_STRICTNESS[left.rule.model] ?? -1;
	const rightScore = POLICY_STRICTNESS[right.rule.model] ?? -1;
	if (leftScore !== rightScore) {
		return leftScore - rightScore;
	}
	const grantDelta =
		countPreConsentGrants(right, gpc) - countPreConsentGrants(left, gpc);
	if (grantDelta !== 0) {
		return grantDelta;
	}
	return scoreScope(left) - scoreScope(right);
};

const pickStrictestPolicyPack = function pickStrictestPolicyPack(
	manifest: ConsentManifest,
	gpc: boolean | undefined
): ConsentManifestPolicyPack | undefined {
	const sorted = manifest.policyPacks
		?.slice()
		.sort((left, right) => comparePolicyStrictness(left, right, gpc));
	return sorted?.[sorted.length - 1];
};

export const resolveStrictestDefaultInit = function resolveStrictestDefaultInit(
	manifest: ConsentManifest,
	inputs: Omit<ResolveInitFromManifestInputs, 'country' | 'region'> = {}
): InitOutput {
	const strictestPack = pickStrictestPolicyPack(manifest, inputs.gpc);
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
					match: { fallback: true },
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

/** Fetches the manifest used by static builds. */
export const loadStaticManifest = (
	options: Omit<StaticManifestModuleOptions, 'exportName'>
): Promise<ConsentManifest> =>
	loadManifest(options, '@c15t/tanstack-start/static');

/** Generates a typed manifest module for a static build. */
export const createStaticManifestModule = (
	options: StaticManifestModuleOptions
): Promise<string> =>
	createModule(options, {
		importSource: '@c15t/tanstack-start/static',
		label: '@c15t/tanstack-start/static',
	});
