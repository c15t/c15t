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
	createMaterialPolicyFingerprint,
	createMaterialPolicyFingerprintSync,
	createPolicyFingerprint,
} from './policy-fingerprint';
import {
	liftLegacyPolicyConfig,
	liftLegacyResolvedPolicy,
	projectPolicyRuleToLegacyConfig,
} from './policy-legacy-bridge';
import {
	matchPolicyRules,
	writePolicyResolutionWire,
} from './policy-resolution';
import type {
	PolicyResolution,
	PolicyResolutionWire,
} from './policy-resolution';
import { inspectPolicyRules, normalizePolicyRule } from './policy-rule';
import type { PolicyRule, ResolvedPolicyRule } from './policy-rule';
import { createPolicyRuleFingerprints } from './policy-rule-fingerprint';
import type { PolicyFingerprints } from './policy-rule-fingerprint';
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
	/**
	 * v2 policy config. Carries the matcher for both contracts.
	 *
	 * BRIDGE: the v2 fields stay until the final sweep so clients that predate
	 * `rule` keep resolving.
	 */
	policy: PolicyConfig;
	/** BRIDGE: v2 wire projection old clients read. */
	resolvedPolicy: ResolvedPolicy;
	/** BRIDGE: v2 exact-policy fingerprint (`createPolicyFingerprint`). */
	fingerprint: string;
	/** v3 normalized rule. Present on every pack of a `schemaVersion: 2` manifest. */
	rule?: ResolvedPolicyRule;
	/** v3 fingerprints precomputed by the producer. */
	fingerprints?: PolicyFingerprints;
}

/** Recorded when the configured rules failed validation at build time. */
export interface ConsentManifestPolicyFailure {
	reason: 'invalid-configuration';
	errors: string[];
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
	/**
	 * `1`: packs carry only the v2 fields. `2`: every pack also carries `rule`
	 * and `fingerprints`, and `policyFailure` may be present.
	 */
	schemaVersion: 1 | 2;
	revision: string;
	tenantId?: string;
	appName?: string;
	branding: ConsentManifestBranding;
	defaults?: ConsentManifestDefaults;
	policyPacks?: ConsentManifestPolicyPack[];
	/**
	 * Present when the configured rules were invalid. Every request then
	 * resolves to `failed` with `invalid-configuration` and the client applies
	 * the safe fallback.
	 */
	policyFailure?: ConsentManifestPolicyFailure;
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
		rule?: ResolvedPolicyRule;
		fingerprints?: PolicyFingerprints;
	}): ConsentManifestPolicyPack {
		return {
			fingerprint: input.fingerprint,
			policy: input.policy,
			resolvedPolicy: createResolvedPolicyFromConfig(input.policy),
			...(input.rule && { rule: input.rule }),
			...(input.fingerprints && { fingerprints: input.fingerprints }),
		};
	};

const liftManifestPack = function liftManifestPack(
	manifest: ConsentManifest,
	pack: ConsentManifestPolicyPack
): { rule: ResolvedPolicyRule; fingerprints: PolicyFingerprints } | undefined {
	if (manifest.schemaVersion === 2) {
		// A v2 manifest must carry the complete precomputed contract. Never
		// fall back to lifting: an incomplete pack is a producer defect.
		if (!pack.rule || !pack.fingerprints) {
			return undefined;
		}
		return { fingerprints: pack.fingerprints, rule: pack.rule };
	}
	// BRIDGE: a schemaVersion 1 manifest from a producer that predates the
	// contract. Lift the v2 projection once per request.
	try {
		const rule = liftLegacyResolvedPolicy(pack.resolvedPolicy);
		return {
			fingerprints: {
				...createPolicyRuleFingerprints(rule),
				legacyMaterial: createMaterialPolicyFingerprintSync(
					pack.resolvedPolicy
				),
			},
			rule,
		};
	} catch {
		return undefined;
	}
};

/**
 * Resolves the v3 policy outcome for one request from a manifest.
 *
 * @remarks
 * Distinguishes unconfigured, matched, no-match and failed. A manifest with
 * `policyFailure` fails every request, an unknown `schemaVersion` fails with
 * `unsupported-contract`, and a `schemaVersion: 2` pack missing its `rule` or
 * `fingerprints` fails with `invalid-configuration` instead of being lifted.
 * An unknown location with neither a fallback nor a default is `failed` with
 * `insufficient-inputs`, not a no-match.
 */
export const resolvePolicyResolutionFromManifest =
	function resolvePolicyResolutionFromManifest(
		manifest: ConsentManifest,
		location: { countryCode: string | null; regionCode: string | null }
	): PolicyResolution {
		if (manifest.schemaVersion !== 1 && manifest.schemaVersion !== 2) {
			return { policy: null, reason: 'unsupported-contract', status: 'failed' };
		}
		if (manifest.policyFailure) {
			return {
				policy: null,
				reason: manifest.policyFailure.reason,
				status: 'failed',
			};
		}
		const packs = manifest.policyPacks;
		if (packs === undefined) {
			return { policy: null, status: 'unconfigured' };
		}
		if (packs.length === 0) {
			return { policy: null, status: 'no-match' };
		}
		try {
			validatePolicies(packs.map((pack) => pack.policy));
		} catch {
			return {
				policy: null,
				reason: 'invalid-configuration',
				status: 'failed',
			};
		}
		const outcome = matchPolicyRules({
			countryCode: location.countryCode,
			entries: packs.map((pack) => ({
				id: pack.policy.id,
				match: pack.policy.match,
			})),
			regionCode: location.regionCode,
		});
		if (outcome.status === 'insufficient-inputs') {
			return { policy: null, reason: 'insufficient-inputs', status: 'failed' };
		}
		if (outcome.status === 'no-match') {
			return { policy: null, status: 'no-match' };
		}
		const pack = packs[outcome.index];
		const lifted = pack ? liftManifestPack(manifest, pack) : undefined;
		if (!lifted) {
			return {
				policy: null,
				reason: 'invalid-configuration',
				status: 'failed',
			};
		}
		return {
			fingerprints: lifted.fingerprints,
			matchedBy: outcome.matchedBy,
			policy: lifted.rule,
			policyId: lifted.rule.id,
			status: 'matched',
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
	const policyResolution: PolicyResolutionWire = writePolicyResolutionWire(
		resolvePolicyResolutionFromManifest(manifest, location)
	);

	return {
		branding: manifest.branding,
		jurisdiction,
		location,
		policyResolution,
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
	/**
	 * v2 policy configs. BRIDGE: lifted to v3 rules at build time; removed in
	 * the final sweep. Configure either `policyPacks` or `policyRules`.
	 */
	readonly policyPacks?: Parameters<
		typeof createConsentManifestPolicyPack
	>[0]['policy'][];
	/** v3 policy rules. */
	readonly policyRules?: readonly PolicyRule[];
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
const buildPacksFromRules = async function buildPacksFromRules(
	rules: readonly PolicyRule[]
): Promise<ConsentManifestPolicyPack[]> {
	return await Promise.all(
		rules.map(async (rule) => {
			const normalized = normalizePolicyRule(rule);
			const policy = projectPolicyRuleToLegacyConfig(rule);
			const resolvedPolicy = createResolvedPolicyFromConfig(policy);
			const fingerprint = await createPolicyFingerprint(resolvedPolicy);
			return createConsentManifestPolicyPack({
				fingerprint,
				fingerprints: createPolicyRuleFingerprints(normalized),
				policy,
				rule: normalized,
			});
		})
	);
};

const buildPacksFromLegacyConfigs = async function buildPacksFromLegacyConfigs(
	policies: readonly PolicyConfig[]
): Promise<ConsentManifestPolicyPack[]> {
	return await Promise.all(
		policies.map(async (policy) => {
			const resolvedPolicy = createResolvedPolicyFromConfig(policy);
			const fingerprint = await createPolicyFingerprint(resolvedPolicy);
			const rule = normalizePolicyRule(liftLegacyPolicyConfig(policy));
			return createConsentManifestPolicyPack({
				fingerprint,
				fingerprints: {
					...createPolicyRuleFingerprints(rule),
					legacyMaterial: await createMaterialPolicyFingerprint(resolvedPolicy),
				},
				policy,
				rule,
			});
		})
	);
};

const buildManifestPolicy = async function buildManifestPolicy(
	config: ConsentManifestConfig
): Promise<Pick<ConsentManifest, 'policyPacks' | 'policyFailure'>> {
	if (config.policyRules && config.policyPacks) {
		throw new TypeError(
			'Configure either policyRules or policyPacks, not both.'
		);
	}
	const iabOptions =
		config.iab?.enabled === undefined
			? undefined
			: { iabEnabled: config.iab.enabled };
	if (config.policyRules) {
		const { errors } = inspectPolicyRules(config.policyRules, iabOptions);
		if (errors.length > 0) {
			return {
				policyFailure: { errors, reason: 'invalid-configuration' },
				policyPacks: [],
			};
		}
		return { policyPacks: await buildPacksFromRules(config.policyRules) };
	}
	if (config.policyPacks) {
		const lifted = config.policyPacks.map((policy) =>
			liftLegacyPolicyConfig(policy)
		);
		const { errors } = inspectPolicyRules(lifted, iabOptions);
		if (errors.length > 0) {
			// Old clients keep the v2 fields exactly as configured; new clients
			// fail safely on the recorded policyFailure.
			const policyPacks = await Promise.all(
				config.policyPacks.map(async (policy) => {
					const resolvedPolicy = createResolvedPolicyFromConfig(policy);
					const fingerprint = await createPolicyFingerprint(resolvedPolicy);
					return createConsentManifestPolicyPack({ fingerprint, policy });
				})
			);
			return {
				policyFailure: { errors, reason: 'invalid-configuration' },
				policyPacks,
			};
		}
		return {
			policyPacks: await buildPacksFromLegacyConfigs(config.policyPacks),
		};
	}
	return {};
};

export const buildConsentManifestFromConfig =
	async function buildConsentManifestFromConfig(
		config: ConsentManifestConfig
	): Promise<ConsentManifest> {
		const { policyFailure, policyPacks } = await buildManifestPolicy(config);

		const manifest: ConsentManifest = {
			appName: config.appName,
			branding: config.branding || 'c15t',
			cmpId: config.iab?.cmpId,
			defaults: { disableGeoLocation: config.disableGeoLocation },
			iab: buildGvlReference(config),
			policyFailure,
			policyPacks,
			revision: '',
			schemaVersion: 2,
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
