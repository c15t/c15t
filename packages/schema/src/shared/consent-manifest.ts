import type { Translations } from '@c15t/translations';
import type { BaseTranslations } from '@c15t/translations/all';

import type { InitOutput } from '../api/init';
import type { brandingValues } from './constants';
import {
	checkJurisdiction,
	getJurisdictionFromLocation,
} from './jurisdiction-runtime';
import { createDeterministicFingerprintSync } from './policy-fingerprint';
import {
	matchPolicyRules,
	readPolicyResolutionWire,
	writePolicyResolutionWire,
} from './policy-resolution';
import type { PolicyResolution } from './policy-resolution';
import { inspectPolicyRules, normalizePolicyRule } from './policy-rule';
import type { PolicyRule, ResolvedPolicyRule } from './policy-rule';
import { createPolicyRuleFingerprints } from './policy-rule-fingerprint';
import type { PolicyFingerprints } from './policy-rule-fingerprint';
import type { PolicyMatch } from './policy-runtime';
import { getTranslationsData } from './translations-runtime';
import type { I18nOptions, LoggerLike } from './translations-runtime';

export type ConsentManifestBranding = (typeof brandingValues)[number];

export interface ConsentManifestGVLReference {
	version?: number | string;
	url: string;
}

export interface ConsentManifestPolicyPack {
	/** The authored geographic matcher. */
	match: PolicyMatch;
	/** Normalized behavior, without presentation or author metadata. */
	rule: ResolvedPolicyRule;
	/** Fingerprints precomputed by the producer. */
	fingerprints: PolicyFingerprints;
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
	schemaVersion: 2;
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

/** Resolves precomputed canonical packs without hashing in the client. */
export const resolvePolicyResolutionFromManifest =
	function resolvePolicyResolutionFromManifest(
		manifest: ConsentManifest,
		location: { countryCode: string | null; regionCode: string | null }
	): PolicyResolution {
		if (manifest.schemaVersion !== 2) {
			return { policy: null, reason: 'unsupported-contract', status: 'failed' };
		}
		if (manifest.policyFailure) {
			return {
				policy: null,
				reason: 'invalid-configuration',
				status: 'failed',
			};
		}
		const packs = manifest.policyPacks;
		if (packs === undefined) {
			return { policy: null, status: 'unconfigured' };
		}
		try {
			if (!Array.isArray(packs)) {
				throw new TypeError('Invalid packs');
			}
			const entries = packs.map((pack) => {
				if (
					Object.keys(pack).some(
						(key) => !['match', 'rule', 'fingerprints'].includes(key)
					)
				) {
					throw new TypeError('Unsupported pack field');
				}
				const parsed = readPolicyResolutionWire({
					fingerprints: pack.fingerprints,
					matchedBy: 'default',
					policy: pack.rule,
					policyId: pack.rule?.id,
					status: 'matched',
					version: 1,
				});
				if (parsed.status !== 'matched') {
					throw new TypeError('Invalid pack');
				}
				return { id: parsed.policy.id, match: pack.match };
			});
			// Validate all matchers and IAB configuration, including unmatched entries.
			const authored = packs.map((pack) => ({
				id: pack.rule.id,
				match: pack.match,
				model: pack.rule.model,
				prompt: pack.rule.prompt,
			}));
			if (
				inspectPolicyRules(authored, { iabEnabled: manifest.iab?.enabled })
					.errors.length
			) {
				throw new TypeError('Invalid matchers');
			}
			if (packs.length === 0) {
				return { policy: null, status: 'no-match' };
			}
			const outcome = matchPolicyRules({ ...location, entries });
			if (outcome.status === 'insufficient-inputs') {
				return {
					policy: null,
					reason: 'insufficient-inputs',
					status: 'failed',
				};
			}
			if (outcome.status === 'no-match') {
				return { policy: null, status: 'no-match' };
			}
			const pack = packs[outcome.index];
			if (!pack) {
				throw new TypeError('Invalid match');
			}
			return readPolicyResolutionWire({
				fingerprints: pack.fingerprints,
				matchedBy: outcome.matchedBy,
				policy: pack.rule,
				policyId: pack.rule.id,
				status: 'matched',
				version: 1,
			});
		} catch {
			return {
				policy: null,
				reason: 'invalid-configuration',
				status: 'failed',
			};
		}
	};

/** Prepares one manifest entry outside render and hydration. */
export const createConsentManifestPolicyPack =
	function createConsentManifestPolicyPack(
		rule: PolicyRule
	): ConsentManifestPolicyPack {
		const normalized = normalizePolicyRule(rule);
		return {
			fingerprints: createPolicyRuleFingerprints(
				normalized,
				rule.legacyMaterial
			),
			match: rule.match,
			rule: normalized,
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
	const resolution = resolvePolicyResolutionFromManifest(manifest, location);
	const resolvedPolicy =
		resolution.status === 'matched' ? resolution.policy : undefined;
	const shouldIncludeIabPayload =
		manifest.iab?.enabled === true && resolvedPolicy?.model === 'iab';

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
	const policyResolution = writePolicyResolutionWire(resolution);

	return {
		branding: manifest.branding,
		jurisdiction,
		location,
		policyResolution,
		translations: responseTranslations as InitOutput['translations'],
		...(shouldIncludeIabPayload && {
			customVendors: manifest.iab?.customVendors,
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

const buildManifestPolicy = function buildManifestPolicy(
	config: ConsentManifestConfig
): Pick<ConsentManifest, 'policyPacks' | 'policyFailure'> {
	if ('policyPacks' in config) {
		return {
			policyFailure: {
				errors: [
					'policyPacks configuration is unsupported; configure policyRules.',
				],
				reason: 'invalid-configuration',
			},
			policyPacks: [],
		};
	}
	if (config.policyRules === undefined) {
		return {};
	}
	const { errors } = inspectPolicyRules(config.policyRules, {
		iabEnabled: config.iab?.enabled,
	});
	if (errors.length) {
		return {
			policyFailure: { errors, reason: 'invalid-configuration' },
			policyPacks: [],
		};
	}
	return {
		policyPacks: config.policyRules.map(createConsentManifestPolicyPack),
	};
};

/** Builds a versioned manifest and precomputes fingerprints once per configuration. */
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
