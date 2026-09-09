import { deepMergeTranslations, selectLanguage } from '@c15t/translations';
import type { CompleteTranslations, Translations } from '@c15t/translations';
import type { BaseTranslations } from '@c15t/translations/all';
import { translations as enTranslations } from '@c15t/translations/en';

import { validatePolicyI18nConfig } from './policy-i18n-validation';
import type { PolicyRule } from './policy-rule';

type SupportedBaseLanguage = Extract<keyof BaseTranslations, string>;

export interface I18nMessageProfile {
	/**
	 * Fallback language used when the requested language is not configured in
	 * this profile.
	 */
	fallbackLanguage?: string;
	translations: Record<string, Partial<Translations>>;
}

export type I18nMessageProfiles = Record<string, I18nMessageProfile>;

export interface I18nOptions {
	/**
	 * Default profile used when a policy does not request a profile.
	 */
	defaultProfile?: string;
	/**
	 * Profile-indexed translation inputs.
	 */
	messages?: I18nMessageProfiles;
}

export interface LoggerLike {
	warn: (message: string, metadata?: Record<string, unknown>) => void;
}

interface TranslationResolutionOptions {
	baseTranslations?: BaseTranslations;
	i18n?: I18nOptions;
	policyI18n?: PolicyRule['i18n'];
	logger?: LoggerLike;
}

interface TranslationCandidate {
	language: string;
	reason: 'profile_language' | 'profile_fallback';
}

const DEFAULT_PROFILE = 'default';
const warnedKeys = new Set<string>();

const isSupportedBaseLanguage = function isSupportedBaseLanguage(
	lang: string,
	translations: Partial<BaseTranslations>
): lang is SupportedBaseLanguage {
	return lang in translations;
};

const warnOnce = function warnOnce(
	logger: LoggerLike | undefined,
	key: string,
	message: string,
	metadata?: Record<string, unknown>
): void {
	if (!logger || warnedKeys.has(key)) {
		return;
	}

	warnedKeys.add(key);
	logger.warn(message, metadata);
};

const normalizeLanguage = function normalizeLanguage(
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
};

const normalizeProfiles = function normalizeProfiles(params: {
	customTranslations?: Record<string, Partial<Translations>>;
	i18n?: I18nOptions;
	logger?: LoggerLike;
}): I18nMessageProfiles {
	const profiles = params.i18n?.messages;
	const legacy = params.customTranslations;

	if (profiles && Object.keys(profiles).length > 0) {
		if (legacy && Object.keys(legacy).length > 0) {
			warnOnce(
				params.logger,
				'i18n.customTranslations.ignored',
				'`customTranslations` is deprecated and ignored when `i18n.messages` is configured.'
			);
		}
		return profiles;
	}

	if (legacy && Object.keys(legacy).length > 0) {
		warnOnce(
			params.logger,
			'i18n.customTranslations.deprecated',
			'`customTranslations` is deprecated. Use `i18n.messages` instead.'
		);
		return {
			[DEFAULT_PROFILE]: {
				translations: legacy,
			},
		};
	}

	return {};
};

const buildCandidates = function buildCandidates(input: {
	language: string;
	fallbackLanguage: string;
}): TranslationCandidate[] {
	const raw: TranslationCandidate[] = [
		{
			language: input.language,
			reason: 'profile_language',
		},
		{
			language: input.fallbackLanguage,
			reason: 'profile_fallback',
		},
	];

	const dedupe = new Set<string>();
	return raw.filter((candidate) => {
		const key = candidate.language;
		if (dedupe.has(key)) {
			return false;
		}
		dedupe.add(key);
		return true;
	});
};

const getProfileLanguages = function getProfileLanguages(
	profiles: I18nMessageProfiles,
	profile: string
): string[] {
	return Object.keys(profiles[profile]?.translations ?? {}).sort();
};

const getSelectableLanguages = function getSelectableLanguages(input: {
	profiles: I18nMessageProfiles;
	profile: string;
}): string[] {
	return getProfileLanguages(input.profiles, input.profile);
};

const resolveFallbackLanguage = function resolveFallbackLanguage(input: {
	profile?: I18nMessageProfile;
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
};

const resolveActiveProfile = function resolveActiveProfile(input: {
	profiles: I18nMessageProfiles;
	defaultProfile: string;
	policyProfile?: string;
	logger?: LoggerLike;
}): string {
	const requestedProfile = input.policyProfile ?? input.defaultProfile;

	if (input.profiles[requestedProfile]) {
		return requestedProfile;
	}

	if (input.policyProfile) {
		warnOnce(
			input.logger,
			`i18n.profile.missing:${requestedProfile}`,
			`Policy i18n profile '${requestedProfile}' does not exist. Falling back to default profile '${input.defaultProfile}'.`
		);
	}

	return input.defaultProfile;
};

export const listProfiles = function listProfiles(options: {
	customTranslations?: Record<string, Partial<Translations>>;
	i18n?: I18nOptions;
}): string[] {
	const profiles = normalizeProfiles({
		customTranslations: options.customTranslations,
		i18n: options.i18n,
	});
	return Object.keys(profiles).sort();
};

export const validateMessages = function validateMessages(options: {
	customTranslations?: Record<string, Partial<Translations>>;
	i18n?: I18nOptions;
	policies?: PolicyRule[];
}): {
	profiles: string[];
	errors: string[];
	warnings: string[];
} {
	return validatePolicyI18nConfig({
		customTranslations: options.customTranslations,
		i18n: options.i18n,
		policies: options.policies,
	});
};

// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const getTranslationsData = function getTranslationsData(
	acceptLanguage: string | null,
	customTranslations?: Record<string, Partial<Translations>>,
	options?: TranslationResolutionOptions
) {
	const availableBaseTranslations: Partial<BaseTranslations> =
		options?.baseTranslations ?? { en: enTranslations };
	const profiles = normalizeProfiles({
		customTranslations,
		i18n: options?.i18n,
		logger: options?.logger,
	});
	const defaultProfile = options?.i18n?.defaultProfile ?? DEFAULT_PROFILE;
	const profile = resolveActiveProfile({
		defaultProfile,
		logger: options?.logger,
		policyProfile: options?.policyI18n?.messageProfile,
		profiles,
	});

	const configuredLanguages =
		Object.keys(profiles).length > 0
			? getSelectableLanguages({
					profile,
					profiles,
				})
			: Object.keys(availableBaseTranslations);
	const fallbackLanguage =
		Object.keys(profiles).length > 0
			? resolveFallbackLanguage({ profile: profiles[profile] })
			: 'en';

	const policyLanguage = normalizeLanguage(options?.policyI18n?.language);
	const requestedBaseLanguage =
		policyLanguage ?? normalizeLanguage(acceptLanguage);
	if (
		!options?.baseTranslations &&
		requestedBaseLanguage &&
		requestedBaseLanguage !== 'en'
	) {
		warnOnce(
			options?.logger,
			`i18n.base-translations.missing:${requestedBaseLanguage}`,
			`Base translations were not provided for '${requestedBaseLanguage}'. Falling back to English translations.`,
			{ requestedLanguage: requestedBaseLanguage }
		);
	}
	const requestedLanguage =
		policyLanguage ??
		selectLanguage(configuredLanguages, {
			fallback: fallbackLanguage,
			header: acceptLanguage,
		});

	const candidates = buildCandidates({
		fallbackLanguage,
		language: requestedLanguage,
	});

	const selectedCandidate = candidates.find(
		(candidate) => !!profiles[profile]?.translations[candidate.language]
	);

	if (selectedCandidate && selectedCandidate.reason !== 'profile_language') {
		warnOnce(
			options?.logger,
			`i18n.fallback:${profile}:${requestedLanguage}:${selectedCandidate.language}`,
			`Policy translation fallback used (${selectedCandidate.reason}).`,
			{
				requestedLanguage,
				requestedProfile: profile,
				resolvedLanguage: selectedCandidate.language,
				resolvedProfile: profile,
			}
		);
	}

	let language = selectedCandidate?.language ?? requestedLanguage;
	if (
		!selectedCandidate &&
		!isSupportedBaseLanguage(language, availableBaseTranslations)
	) {
		warnOnce(
			options?.logger,
			`i18n.base-fallback:${language}`,
			`No translation found for '${language}'. Falling back to base English translations.`
		);
		language = 'en';
	}

	const base = isSupportedBaseLanguage(language, availableBaseTranslations)
		? (availableBaseTranslations[language] ?? enTranslations)
		: enTranslations;
	const custom = selectedCandidate
		? profiles[profile]?.translations[selectedCandidate.language]
		: undefined;
	const translations = custom ? deepMergeTranslations(base, custom) : base;

	return {
		language,
		translations: translations as CompleteTranslations,
	};
};

export const getTranslations = function getTranslations(
	acceptLanguage: string,
	options: {
		baseTranslations?: BaseTranslations;
		customTranslations?: Record<string, Partial<Translations>>;
		i18n?: I18nOptions;
		policyI18n?: PolicyRule['i18n'];
		logger?: LoggerLike;
	}
) {
	return getTranslationsData(acceptLanguage, options.customTranslations, {
		baseTranslations: options.baseTranslations,
		i18n: options.i18n,
		logger: options.logger,
		policyI18n: options.policyI18n,
	});
};
