import {
	resolvePolicyDecision,
	validatePolicies,
	validatePolicyI18nConfig,
} from '@c15t/schema/types';
import {
	deepMergeTranslations,
	selectLanguage,
	type TranslationConfig,
	type Translations,
} from '@c15t/translations';
import { baseTranslations } from '@c15t/translations/all';
import { checkJurisdiction } from '../../libs/jurisdiction';
import type { OfflinePolicyConfig } from '../../store/type';
import { defaultTranslationConfig } from '../../translations';
import type { InitResponse } from '../client-interface';
import {
	buildFallbackInitData,
	resolveFallbackPolicy,
	resolveNoPolicyFallback,
} from '../shared/init-fallback';
import type { FetchOptions, ResponseContext } from '../types';
import type { IABFallbackConfig } from './types';
import { createResponseContext } from './utils';

type SupportedBaseLanguage = keyof typeof baseTranslations;
type OfflineI18nProfile = NonNullable<
	NonNullable<OfflinePolicyConfig['i18n']>['messages']
>[string];

const DEFAULT_PROFILE = 'default';

function isSupportedBaseLanguage(lang: string): lang is SupportedBaseLanguage {
	return lang in baseTranslations;
}

function normalizeLanguage(
	value: string | null | undefined
): string | undefined {
	if (!value) {
		return undefined;
	}

	const normalized = value.split(',')[0]?.split(';')[0]?.trim().toLowerCase();
	if (!normalized) {
		return undefined;
	}

	return normalized.split('-')[0] ?? undefined;
}

function getProfileLanguages(
	profiles: Record<string, OfflineI18nProfile>,
	profile: string
): string[] {
	return Object.keys(profiles[profile]?.translations ?? {}).sort();
}

function resolveActiveProfile(input: {
	profiles: Record<string, OfflineI18nProfile>;
	defaultProfile: string;
	policyProfile?: string;
}): string {
	const requestedProfile = input.policyProfile ?? input.defaultProfile;
	return input.profiles[requestedProfile]
		? requestedProfile
		: input.defaultProfile;
}

function resolveProfileFallbackLanguage(input: {
	profile?: OfflineI18nProfile;
}): string {
	const configuredFallbackLanguage =
		normalizeLanguage(input.profile?.fallbackLanguage) ?? 'en';
	const profileLanguages = Object.keys(
		input.profile?.translations ?? {}
	).sort();

	if (profileLanguages.includes(configuredFallbackLanguage)) {
		return configuredFallbackLanguage;
	}

	if (profileLanguages.includes('en')) {
		return 'en';
	}

	return profileLanguages[0] ?? configuredFallbackLanguage;
}

function resolveOfflinePolicyTranslations(input: {
	acceptLanguage: string | null;
	i18n: NonNullable<OfflinePolicyConfig['i18n']>;
	policyI18n?: {
		language?: string;
		messageProfile?: string;
	};
}): { language: string; translations: Translations } {
	const profiles = input.i18n.messages ?? {};
	const defaultProfile = input.i18n.defaultProfile ?? DEFAULT_PROFILE;
	const profile = resolveActiveProfile({
		profiles,
		defaultProfile,
		policyProfile: input.policyI18n?.messageProfile,
	});
	const profileLanguages = getProfileLanguages(profiles, profile);
	const fallbackLanguage = resolveProfileFallbackLanguage({
		profile: profiles[profile],
	});
	const policyLanguage = normalizeLanguage(input.policyI18n?.language);
	const requestedLanguage =
		policyLanguage ??
		selectLanguage(profileLanguages, {
			header: input.acceptLanguage,
			fallback: fallbackLanguage,
		});
	const resolvedLanguage = profiles[profile]?.translations[requestedLanguage]
		? requestedLanguage
		: fallbackLanguage;
	const base = isSupportedBaseLanguage(resolvedLanguage)
		? baseTranslations[resolvedLanguage]
		: baseTranslations.en;
	const custom = profiles[profile]?.translations[resolvedLanguage];

	return {
		language: resolvedLanguage,
		translations: custom ? deepMergeTranslations(base, custom) : base,
	};
}

function resolveConfiguredFallbackLanguage(
	translations: Record<string, Partial<Translations>>,
	defaultLanguage?: string
): string {
	const configuredLanguages = Object.keys(translations).sort();
	const normalizedDefault = defaultLanguage?.toLowerCase();

	if (normalizedDefault && configuredLanguages.includes(normalizedDefault)) {
		return normalizedDefault;
	}

	if (configuredLanguages.includes('en')) {
		return 'en';
	}

	return configuredLanguages[0] ?? 'en';
}

/**
 * Checks if a consent banner should be shown.
 * In offline mode, will always return true unless localStorage or cookie has a value.
 */
export async function init(
	initialTranslationConfig?: Partial<TranslationConfig>,
	options?: FetchOptions<InitResponse>,
	iabConfig?: IABFallbackConfig,
	policyConfig?: OfflinePolicyConfig
): Promise<ResponseContext<InitResponse>> {
	// Check localStorage and cookie to see if the banner has been shown
	const country = options?.headers?.['x-c15t-country'] ?? 'GB';
	const region = options?.headers?.['x-c15t-region'] ?? null;

	const headerLanguage =
		(options?.headers?.['accept-language'] as string | undefined) ?? null;

	const jurisdictionCode = checkJurisdiction(country, region);
	const configuredPolicies = policyConfig?.policyPacks;
	const hasExplicitPolicies = policyConfig?.policyPacks !== undefined;
	const i18nValidation = validatePolicyI18nConfig({
		i18n: policyConfig?.i18n,
		policies: configuredPolicies,
	});

	for (const warning of i18nValidation.warnings) {
		console.warn(`[c15t] offlinePolicy.i18n: ${warning}`);
	}

	if (i18nValidation.errors.length > 0) {
		throw new Error(
			`Invalid offlinePolicy.i18n configuration:\n${i18nValidation.errors
				.map((error) => `- ${error}`)
				.join('\n')}`
		);
	}

	if (configuredPolicies && configuredPolicies.length > 0) {
		validatePolicies(configuredPolicies, {
			iabEnabled: iabConfig?.enabled === true,
		});
	}

	const resolvedPolicyDecision =
		configuredPolicies && configuredPolicies.length > 0
			? await resolvePolicyDecision({
					policies: configuredPolicies,
					countryCode: country,
					regionCode: region,
					jurisdiction: jurisdictionCode,
					iabEnabled: iabConfig?.enabled === true,
				})
			: undefined;

	const shouldUseSyntheticFallbackDefaults =
		!policyConfig?.policy && !resolvedPolicyDecision && !hasExplicitPolicies;

	const resolvedPolicyConfig: OfflinePolicyConfig = {
		...policyConfig,
		policy:
			policyConfig?.policy ??
			resolvedPolicyDecision?.policy ??
			(hasExplicitPolicies ? resolveNoPolicyFallback() : undefined) ??
			(shouldUseSyntheticFallbackDefaults
				? resolveFallbackPolicy({})
				: undefined),
		policyDecision:
			policyConfig?.policyDecision ??
			(resolvedPolicyDecision
				? {
						policyId: resolvedPolicyDecision.policy.id,
						fingerprint: resolvedPolicyDecision.fingerprint,
						matchedBy: resolvedPolicyDecision.matchedBy,
						country,
						region,
						jurisdiction: jurisdictionCode,
					}
				: undefined),
	};

	let language: string;
	let translationsForLanguage: Translations;

	if (
		policyConfig?.i18n?.messages &&
		Object.keys(policyConfig.i18n.messages).length > 0
	) {
		const resolvedTranslations = resolveOfflinePolicyTranslations({
			acceptLanguage: headerLanguage,
			i18n: policyConfig.i18n,
			policyI18n: resolvedPolicyConfig.policy?.i18n,
		});
		language = resolvedTranslations.language;
		translationsForLanguage = resolvedTranslations.translations;
	} else if (
		initialTranslationConfig?.translations &&
		Object.keys(initialTranslationConfig.translations).length > 0
	) {
		const customTranslations = initialTranslationConfig.translations as Record<
			string,
			Partial<Translations>
		>;

		const availableLanguages = Object.keys(customTranslations);
		const fallbackLanguage = resolveConfiguredFallbackLanguage(
			customTranslations,
			initialTranslationConfig.defaultLanguage
		);

		language = selectLanguage(availableLanguages, {
			header: headerLanguage,
			fallback: fallbackLanguage,
		});

		const base = isSupportedBaseLanguage(language)
			? baseTranslations[language]
			: baseTranslations.en;
		const customForLanguage = customTranslations[language] ?? {};
		translationsForLanguage = deepMergeTranslations(
			base,
			customForLanguage as Partial<Translations>
		);
	} else {
		const availableLanguages = Object.keys(
			defaultTranslationConfig.translations
		);
		const fallbackLanguage = defaultTranslationConfig.defaultLanguage ?? 'en';

		language = selectLanguage(availableLanguages, {
			header: headerLanguage,
			fallback: fallbackLanguage,
		});

		translationsForLanguage = defaultTranslationConfig.translations[
			language as keyof typeof defaultTranslationConfig.translations
		] as Translations;
	}

	// Get GVL for IAB mode.
	// Priority: 1) Pre-loaded from config (always honoured when provided),
	// 2) Fetch from external endpoint (only when policy model is iab)
	let gvl = null;
	if (iabConfig?.enabled && resolvedPolicyConfig.policy?.model === 'iab') {
		if (iabConfig.gvl) {
			// Pre-loaded GVL always used when explicitly provided (testing/SSR)
			gvl = iabConfig.gvl;
		} else {
			try {
				const { fetchGVL } = await import('../../libs/iab-tcf/fetch-gvl');
				gvl = await fetchGVL(iabConfig.vendorIds);
			} catch (error) {
				console.warn('Failed to fetch GVL in offline mode:', error);
			}
		}
	}

	const responseData = buildFallbackInitData({
		jurisdiction: jurisdictionCode,
		countryCode: country,
		regionCode: region,
		language,
		translations: translationsForLanguage,
		gvl,
		policy: resolvedPolicyConfig.policy,
		policyDecision: resolvedPolicyConfig.policyDecision,
		policySnapshotToken: resolvedPolicyConfig.policySnapshotToken,
	});
	const response = createResponseContext<InitResponse>(responseData);

	// Call success callback if provided
	if (options?.onSuccess) {
		await options.onSuccess(response);
	}

	return response;
}
