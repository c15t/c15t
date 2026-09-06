import type { Translations } from '@c15t/translations';
import type { BaseTranslations } from '@c15t/translations/all';

import type { InitOutput, PolicyDecision, ResolvedPolicy } from '../api/init';
import type { brandingValues } from './constants';
import {
	checkJurisdiction,
	getJurisdictionFromLocation,
} from './jurisdiction-runtime';
import {
	createDeterministicFingerprintSync,
	createPolicyFingerprint,
} from './policy-fingerprint';
import {
	createResolvedPolicyFromConfig,
	validatePolicies,
} from './policy-runtime';
import type {
	JurisdictionCode,
	PolicyConfig,
	PolicyMatchedBy,
} from './policy-runtime';
import { getTranslationsData } from './translations-runtime';
import type { I18nOptions, LoggerLike } from './translations-runtime';

export type ConsentManifestBranding = (typeof brandingValues)[number];

export interface ConsentManifestGVLReference {
	version?: number | string;
	url: string;
}

export interface ConsentManifestPolicyPack {
	policy: PolicyConfig;
	resolvedPolicy: ResolvedPolicy;
	fingerprint: string;
}

export interface ConsentManifestTranslationInputs {
	customTranslations?: Record<string, Partial<Translations>>;
	i18n?: I18nOptions;
}

export interface ConsentManifestDefaults {
	disableGeoLocation?: boolean;
}

export interface ConsentManifestIAB {
	enabled: boolean;
	customVendors?: InitOutput['customVendors'];
	gvl?: ConsentManifestGVLReference;
}

export interface ConsentManifest {
	schemaVersion: 1;
	revision: string;
	tenantId?: string;
	appName?: string;
	branding: ConsentManifestBranding;
	defaults?: ConsentManifestDefaults;
	policyPacks?: ConsentManifestPolicyPack[];
	translations?: ConsentManifestTranslationInputs;
	cmpId?: number;
	iab?: ConsentManifestIAB;
}

export interface ResolveInitFromManifestInputs {
	country?: string | null;
	region?: string | null;
	language?: string | null;
	gpc?: boolean;
}

export interface ResolveInitFromManifestOptions {
	/** Base translations available to the manifest resolver. */
	baseTranslations?: BaseTranslations;

	/** Logger used for one-time translation fallback warnings. */
	logger?: LoggerLike;
}

const normalizeLanguageSlice = function normalizeLanguageSlice(
	value: string
): string {
	const normalized = value.split(',')[0]?.split(';')[0]?.trim().toLowerCase();
	return normalized?.split('-')[0] ?? value;
};

const stripIabTranslations = function stripIabTranslations(
	translations: Record<string, unknown>
): Record<string, unknown> {
	const { iab: _iab, ...rest } = translations;
	return rest;
};

export const resolveNoPolicyFallback =
	function resolveNoPolicyFallback(): ResolvedPolicy {
		return {
			id: 'no_banner',
			model: 'none',
			ui: {
				mode: 'none',
			},
		};
	};

const DEFAULT_CONSENT_CATEGORIES = [
	'necessary',
	'functionality',
	'marketing',
	'measurement',
	'experience',
] as const;

export const buildDefaultOptInPolicy = function buildDefaultOptInPolicy(
	categories?: string[]
): ResolvedPolicy {
	return {
		consent: {
			categories:
				categories && categories.length > 0
					? categories
					: [...DEFAULT_CONSENT_CATEGORIES],
			scopeMode: 'permissive',
		},
		id: 'default-opt-in',
		model: 'opt-in',
		ui: {
			mode: 'banner',
		},
	};
};

const normalizeCountryCode = function normalizeCountryCode(
	countryCode: string | null
): string | null {
	if (!countryCode) {
		return null;
	}

	return countryCode.toUpperCase();
};

const normalizeRegionCode = function normalizeRegionCode(
	regionCode: string | null
): string | null {
	if (!regionCode) {
		return null;
	}

	return (
		(regionCode.includes('-') ? regionCode.split('-').pop() : regionCode)
			?.toUpperCase()
			.trim() ?? null
	);
};

const createRegionMatcherKey = function createRegionMatcherKey(
	countryCode: string,
	regionCode: string
): string {
	return `${countryCode}:${regionCode}`;
};

// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
const resolvePolicyPackMatch = function resolvePolicyPackMatch(params: {
	packs: ConsentManifestPolicyPack[];
	countryCode: string | null;
	regionCode: string | null;
	iabEnabled?: boolean;
}):
	| {
			pack: ConsentManifestPolicyPack;
			matchedBy: PolicyMatchedBy;
	  }
	| undefined {
	const policies = params.packs.map((pack) => pack.policy);
	try {
		validatePolicies(
			policies,
			params.iabEnabled === undefined
				? undefined
				: { iabEnabled: params.iabEnabled }
		);
	} catch {
		return undefined;
	}

	const countryCode = normalizeCountryCode(params.countryCode);
	const regionCode = normalizeRegionCode(params.regionCode);
	const regionKey =
		countryCode && regionCode
			? createRegionMatcherKey(countryCode, regionCode)
			: undefined;
	let fallbackPack: ConsentManifestPolicyPack | undefined;
	let defaultPack: ConsentManifestPolicyPack | undefined;

	for (const pack of params.packs) {
		for (const region of pack.policy.match.regions ?? []) {
			const normalizedRegion = {
				country: region.country.trim().toUpperCase(),
				region: (region.region.includes('-')
					? region.region.split('-').pop()
					: region.region
				)
					?.trim()
					.toUpperCase(),
			};
			if (
				regionKey &&
				normalizedRegion.region &&
				createRegionMatcherKey(
					normalizedRegion.country,
					normalizedRegion.region
				) === regionKey
			) {
				return { matchedBy: 'region', pack };
			}
		}
	}

	for (const pack of params.packs) {
		for (const country of pack.policy.match.countries ?? []) {
			if (countryCode && country.trim().toUpperCase() === countryCode) {
				return { matchedBy: 'country', pack };
			}
		}
	}

	for (const pack of params.packs) {
		if (!defaultPack && pack.policy.match.isDefault === true) {
			defaultPack = pack;
		}
		if (!fallbackPack && pack.policy.match.fallback === true) {
			fallbackPack = pack;
		}
	}

	if (!countryCode && fallbackPack) {
		return { matchedBy: 'fallback', pack: fallbackPack };
	}

	if (defaultPack) {
		return { matchedBy: 'default', pack: defaultPack };
	}

	return undefined;
};

const createPolicyDecision = function createPolicyDecision(params: {
	pack: ConsentManifestPolicyPack;
	matchedBy: PolicyMatchedBy;
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction: JurisdictionCode;
}): PolicyDecision {
	return {
		country: params.countryCode,
		fingerprint: params.pack.fingerprint,
		jurisdiction: params.jurisdiction,
		matchedBy: params.matchedBy,
		policyId: params.pack.resolvedPolicy.id,
		region: params.regionCode,
	};
};

export const createConsentManifestPolicyPack =
	function createConsentManifestPolicyPack(input: {
		policy: PolicyConfig;
		fingerprint: string;
	}): ConsentManifestPolicyPack {
		return {
			fingerprint: input.fingerprint,
			policy: input.policy,
			resolvedPolicy: createResolvedPolicyFromConfig(input.policy),
		};
	};

export const sliceConsentManifestLanguage =
	function sliceConsentManifestLanguage(
		manifest: ConsentManifest,
		language: string
	): ConsentManifest {
		const normalizedLanguage = normalizeLanguageSlice(language);
		const customTranslations = manifest.translations?.customTranslations;
		const i18n = manifest.translations?.i18n;

		return {
			...manifest,
			translations: {
				customTranslations: customTranslations
					? {
							...(customTranslations[normalizedLanguage] && {
								[normalizedLanguage]: customTranslations[normalizedLanguage],
							}),
						}
					: undefined,
				i18n: i18n
					? {
							...i18n,
							messages: i18n.messages
								? Object.fromEntries(
										Object.entries(i18n.messages).map(
											([profileName, profile]) => [
												profileName,
												{
													...profile,
													translations: {
														...(profile.translations[normalizedLanguage] && {
															[normalizedLanguage]:
																profile.translations[normalizedLanguage],
														}),
													},
												},
											]
										)
									)
								: undefined,
						}
					: undefined,
			},
		};
	};

// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const resolveInitFromManifest = function resolveInitFromManifest(
	manifest: ConsentManifest,
	inputs: ResolveInitFromManifestInputs,
	options?: ResolveInitFromManifestOptions
): InitOutput {
	const location = {
		countryCode: inputs.country ?? null,
		regionCode: inputs.region ?? null,
	};
	const jurisdiction = getJurisdictionFromLocation(location, {
		disableGeoLocation: manifest.defaults?.disableGeoLocation,
	});
	const hasExplicitPolicyPack = manifest.policyPacks !== undefined;
	const isExplicitEmptyPolicyPack =
		hasExplicitPolicyPack && (manifest.policyPacks?.length ?? 0) === 0;
	const policyMatch =
		isExplicitEmptyPolicyPack || !manifest.policyPacks
			? undefined
			: resolvePolicyPackMatch({
					countryCode: location.countryCode,
					iabEnabled: manifest.iab?.enabled,
					packs: manifest.policyPacks,
					regionCode: location.regionCode,
				});
	const resolvedPolicy = hasExplicitPolicyPack
		? (policyMatch?.pack.resolvedPolicy ?? resolveNoPolicyFallback())
		: undefined;
	const shouldIncludeIabPayload =
		manifest.iab?.enabled === true &&
		(!hasExplicitPolicyPack || resolvedPolicy?.model === 'iab');

	const translationsResult = getTranslationsData(
		inputs.language ?? 'en',
		manifest.translations?.customTranslations,
		{
			baseTranslations: options?.baseTranslations,
			i18n: manifest.translations?.i18n,
			logger: options?.logger,
			policyI18n: resolvedPolicy?.i18n,
		}
	);
	const responseTranslations = shouldIncludeIabPayload
		? translationsResult
		: {
				...translationsResult,
				translations: stripIabTranslations(
					translationsResult.translations as unknown as Record<string, unknown>
				),
			};
	const policyDecision = policyMatch
		? createPolicyDecision({
				countryCode: location.countryCode,
				jurisdiction,
				matchedBy: policyMatch.matchedBy,
				pack: policyMatch.pack,
				regionCode: location.regionCode,
			})
		: undefined;

	return {
		branding: manifest.branding,
		jurisdiction,
		location,
		translations: responseTranslations as InitOutput['translations'],
		...(shouldIncludeIabPayload && {
			customVendors: manifest.iab?.customVendors,
		}),
		...(resolvedPolicy && {
			policy: resolvedPolicy,
		}),
		...(policyDecision && {
			policyDecision,
		}),
		...(shouldIncludeIabPayload &&
			manifest.cmpId !== null &&
			manifest.cmpId !== undefined && {
				cmpId: manifest.cmpId,
			}),
	};
};

export { checkJurisdiction };

/**
 * The configuration a consent manifest is built from.
 *
 * Declared structurally rather than as the backend's options type, so this can
 * live here without the schema package depending on the backend. Any config
 * object carrying these fields will do.
 */
export interface ConsentManifestConfig {
	readonly tenantId?: string;
	readonly appName?: string;
	readonly branding?: ConsentManifest['branding'];
	readonly disableGeoLocation?: boolean;
	readonly policyPacks?: Parameters<
		typeof createConsentManifestPolicyPack
	>[0]['policy'][];
	readonly customTranslations?: ConsentManifest['translations'] extends
		| { customTranslations?: infer T }
		| undefined
		? T
		: never;
	readonly i18n?: ConsentManifest['translations'] extends
		| { i18n?: infer T }
		| undefined
		? T
		: never;
	readonly iab?: {
		readonly enabled?: boolean;
		readonly cmpId?: number;
		readonly customVendors?: NonNullable<
			ConsentManifest['iab']
		>['customVendors'];
		readonly endpoint?: string;
	};
}

const DEFAULT_GVL_ENDPOINT = 'https://gvl.inth.app';

const buildGvlReference = function buildGvlReference(
	config: ConsentManifestConfig
): ConsentManifest['iab'] {
	if (config.iab?.enabled !== true) {
		return undefined;
	}

	return {
		customVendors: config.iab.customVendors,
		enabled: true,
		gvl: { url: config.iab.endpoint ?? DEFAULT_GVL_ENDPOINT },
	};
};

/**
 * Builds a consent manifest from per-tenant configuration.
 *
 * Lives here rather than in a backend so that every implementation serving
 * `/manifest` produces a byte-identical document from the same config. RFC
 * 0001 makes that a design principle — "there is exactly one resolver
 * implementation" — and it matters more during RFC 0004's parallel phase,
 * where two backends serve the same tenants and any divergence would
 * invalidate both the contract tests and the benchmark comparison.
 *
 * Pure and geo-independent by construction: nothing here reads a request.
 */
export const buildConsentManifestFromConfig =
	async function buildConsentManifestFromConfig(
		config: ConsentManifestConfig
	): Promise<ConsentManifest> {
		const policyPacks = config.policyPacks
			? await Promise.all(
					config.policyPacks.map(async (policy) => {
						const resolvedPolicy = createResolvedPolicyFromConfig(policy);
						const fingerprint = await createPolicyFingerprint(resolvedPolicy);
						return createConsentManifestPolicyPack({ fingerprint, policy });
					})
				)
			: undefined;

		const manifest: ConsentManifest = {
			appName: config.appName,
			branding: config.branding || 'c15t',
			cmpId: config.iab?.cmpId,
			defaults: { disableGeoLocation: config.disableGeoLocation },
			iab: buildGvlReference(config),
			policyPacks,
			revision: '',
			schemaVersion: 1,
			tenantId: config.tenantId,
			translations: {
				customTranslations: config.customTranslations,
				i18n: config.i18n,
			},
		};

		// The revision is a fingerprint of the manifest itself, so a client can
		// tell two manifests apart without diffing them.
		return {
			...manifest,
			revision: createDeterministicFingerprintSync(manifest),
		};
	};
