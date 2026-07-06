import type { Translations } from '@c15t/translations';
import type { InitOutput, PolicyDecision, ResolvedPolicy } from '../api/init';
import { brandingValues } from './constants';
import {
	checkJurisdiction,
	getJurisdictionFromLocation,
} from './jurisdiction-runtime';
import {
	createResolvedPolicyFromConfig,
	type JurisdictionCode,
	type PolicyConfig,
	type PolicyMatchedBy,
	validatePolicies,
} from './policy-runtime';
import {
	getTranslationsData,
	type I18nOptions,
	type LoggerLike,
} from './translations-runtime';

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
	logger?: LoggerLike;
}

function normalizeLanguageSlice(value: string): string {
	const normalized = value.split(',')[0]?.split(';')[0]?.trim().toLowerCase();
	return normalized?.split('-')[0] ?? value;
}

function stripIabTranslations(
	translations: Record<string, unknown>
): Record<string, unknown> {
	const { iab: _iab, ...rest } = translations;
	return rest;
}

export function resolveNoPolicyFallback(): ResolvedPolicy {
	return {
		id: 'no_banner',
		model: 'none',
		ui: {
			mode: 'none',
		},
	};
}

const DEFAULT_CONSENT_CATEGORIES = [
	'necessary',
	'functionality',
	'marketing',
	'measurement',
	'experience',
] as const;

export function buildDefaultOptInPolicy(categories?: string[]): ResolvedPolicy {
	return {
		id: 'default-opt-in',
		model: 'opt-in',
		consent: {
			categories:
				categories && categories.length > 0
					? categories
					: [...DEFAULT_CONSENT_CATEGORIES],
			scopeMode: 'permissive',
		},
		ui: {
			mode: 'banner',
		},
	};
}

function normalizeCountryCode(countryCode: string | null): string | null {
	if (!countryCode) {
		return null;
	}

	return countryCode.toUpperCase();
}

function normalizeRegionCode(regionCode: string | null): string | null {
	if (!regionCode) {
		return null;
	}

	return (
		(regionCode.includes('-') ? regionCode.split('-').pop() : regionCode)
			?.toUpperCase()
			.trim() ?? null
	);
}

function createRegionMatcherKey(
	countryCode: string,
	regionCode: string
): string {
	return `${countryCode}:${regionCode}`;
}

function resolvePolicyPackMatch(params: {
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
				return { pack, matchedBy: 'region' };
			}
		}
	}

	for (const pack of params.packs) {
		for (const country of pack.policy.match.countries ?? []) {
			if (countryCode && country.trim().toUpperCase() === countryCode) {
				return { pack, matchedBy: 'country' };
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
		return { pack: fallbackPack, matchedBy: 'fallback' };
	}

	if (defaultPack) {
		return { pack: defaultPack, matchedBy: 'default' };
	}

	return undefined;
}

function createPolicyDecision(params: {
	pack: ConsentManifestPolicyPack;
	matchedBy: PolicyMatchedBy;
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction: JurisdictionCode;
}): PolicyDecision {
	return {
		policyId: params.pack.resolvedPolicy.id,
		fingerprint: params.pack.fingerprint,
		matchedBy: params.matchedBy,
		country: params.countryCode,
		region: params.regionCode,
		jurisdiction: params.jurisdiction,
	};
}

export function createConsentManifestPolicyPack(input: {
	policy: PolicyConfig;
	fingerprint: string;
}): ConsentManifestPolicyPack {
	return {
		policy: input.policy,
		resolvedPolicy: createResolvedPolicyFromConfig(input.policy),
		fingerprint: input.fingerprint,
	};
}

export function sliceConsentManifestLanguage(
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
}

export function resolveInitFromManifest(
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
					packs: manifest.policyPacks,
					countryCode: location.countryCode,
					regionCode: location.regionCode,
					iabEnabled: manifest.iab?.enabled,
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
			i18n: manifest.translations?.i18n,
			policyI18n: resolvedPolicy?.i18n,
			logger: options?.logger,
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
				pack: policyMatch.pack,
				matchedBy: policyMatch.matchedBy,
				countryCode: location.countryCode,
				regionCode: location.regionCode,
				jurisdiction,
			})
		: undefined;

	return {
		jurisdiction,
		location,
		translations: responseTranslations as InitOutput['translations'],
		branding: manifest.branding,
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
			manifest.cmpId != null && {
				cmpId: manifest.cmpId,
			}),
	};
}

export { checkJurisdiction };
