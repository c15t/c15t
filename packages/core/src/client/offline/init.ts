import { resolvePolicyDecision as resolvePolicyPackDecision } from '@c15t/schema/types';
import {
	deepMergeTranslations,
	enTranslations,
	selectLanguage,
	type TranslationConfig,
	type Translations,
} from '@c15t/translations';
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

	let language: string;
	let translationsForLanguage: Translations;

	const headerLanguage =
		(options?.headers?.['accept-language'] as string | undefined) ?? null;

	// When a custom translation config is provided (via store options),
	// prefer its languages while always falling back to English strings.
	if (
		initialTranslationConfig?.translations &&
		Object.keys(initialTranslationConfig.translations).length > 0
	) {
		const customTranslations = initialTranslationConfig.translations as Record<
			string,
			Partial<Translations>
		>;

		const availableLanguages = Array.from(
			new Set(['en', ...Object.keys(customTranslations)])
		);

		const fallbackLanguage = initialTranslationConfig.defaultLanguage ?? 'en';

		language = selectLanguage(availableLanguages, {
			header: headerLanguage,
			fallback: fallbackLanguage,
		});

		const customForLanguage = customTranslations[language] ?? {};
		translationsForLanguage = deepMergeTranslations(
			enTranslations,
			customForLanguage as Partial<Translations>
		);
	} else {
		// Fallback to the built-in default translation config (English only)
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

	const jurisdictionCode = checkJurisdiction(country, region);
	const configuredPolicyPack =
		policyConfig?.policies ?? policyConfig?.policyPack;
	const hasExplicitPolicyPack =
		policyConfig?.policies !== undefined ||
		policyConfig?.policyPack !== undefined;
	const isExplicitEmptyPolicyPack =
		hasExplicitPolicyPack && (configuredPolicyPack?.length ?? 0) === 0;
	const usesIabPolicy =
		configuredPolicyPack?.some((policy) => policy.consent?.model === 'iab') ??
		false;
	if (usesIabPolicy && iabConfig?.enabled !== true) {
		throw new Error(
			'Policies using consent.model="iab" require top-level iab.enabled=true'
		);
	}

	const resolvedPolicyPackDecision =
		configuredPolicyPack && configuredPolicyPack.length > 0
			? await resolvePolicyPackDecision({
					policies: configuredPolicyPack,
					countryCode: country,
					regionCode: region,
					jurisdiction: jurisdictionCode,
					iabEnabled: iabConfig?.enabled === true,
				})
			: undefined;

	const shouldUseSyntheticFallbackDefaults =
		!policyConfig?.policy &&
		!resolvedPolicyPackDecision &&
		!hasExplicitPolicyPack;

	const resolvedPolicyConfig: OfflinePolicyConfig = {
		...policyConfig,
		policy:
			policyConfig?.policy ??
			resolvedPolicyPackDecision?.policy ??
			(isExplicitEmptyPolicyPack ? resolveNoPolicyFallback() : undefined) ??
			(shouldUseSyntheticFallbackDefaults
				? resolveFallbackPolicy({
						iabEnabled: iabConfig?.enabled === true,
					})
				: undefined),
		policyDecision:
			policyConfig?.policyDecision ??
			(resolvedPolicyPackDecision
				? {
						policyId: resolvedPolicyPackDecision.policy.id,
						fingerprint: resolvedPolicyPackDecision.fingerprint,
						matchedBy: resolvedPolicyPackDecision.matchedBy,
						country,
						region,
						jurisdiction: jurisdictionCode,
					}
				: undefined),
	};

	// Get GVL for IAB mode.
	// If a synthetic offline policy is provided, only fetch GVL when policy model is iab.
	// Priority: 1) Pre-loaded from config, 2) Fetch from external endpoint
	let gvl = null;
	const shouldResolveIab =
		iabConfig?.enabled && resolvedPolicyConfig.policy?.model === 'iab';
	if (shouldResolveIab) {
		if (iabConfig.gvl) {
			// Use pre-loaded GVL from config (testing/SSR)
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
