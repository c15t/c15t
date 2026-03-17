import {
	type CompleteTranslations,
	deepMergeTranslations,
	selectLanguage,
	type Translations,
} from '@c15t/translations';
import { baseTranslations } from '@c15t/translations/all';
import type {
	C15TOptions,
	I18nMessageProfile,
	I18nMessageProfiles,
	PolicyConfig,
} from '~/types';

type SupportedBaseLanguage = keyof typeof baseTranslations;

interface LoggerLike {
	warn: (message: string, metadata?: Record<string, unknown>) => void;
}

interface TranslationResolutionOptions {
	i18n?: C15TOptions['i18n'];
	policyI18n?: PolicyConfig['i18n'];
	logger?: LoggerLike;
}

interface TranslationCandidate {
	language: string;
	reason: 'profile_language' | 'profile_fallback';
}

const DEFAULT_PROFILE = 'default';
// Module-scoped: warns once per process lifetime, intentionally not per-tenant.
const warnedKeys = new Set<string>();

function isSupportedBaseLanguage(lang: string): lang is SupportedBaseLanguage {
	return lang in baseTranslations;
}

function warnOnce(
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

function normalizeProfiles(params: {
	customTranslations?: Record<string, Partial<Translations>>;
	i18n?: C15TOptions['i18n'];
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
}

function buildCandidates(input: {
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
}

function getProfileLanguages(
	profiles: I18nMessageProfiles,
	profile: string
): string[] {
	return Object.keys(profiles[profile]?.translations ?? {}).sort();
}

function getSelectableLanguages(input: {
	profiles: I18nMessageProfiles;
	profile: string;
}): string[] {
	return getProfileLanguages(input.profiles, input.profile);
}

function resolveFallbackLanguage(input: {
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
}

function resolveActiveProfile(input: {
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
}

export function listProfiles(options: {
	customTranslations?: Record<string, Partial<Translations>>;
	i18n?: C15TOptions['i18n'];
}): string[] {
	const profiles = normalizeProfiles({
		customTranslations: options.customTranslations,
		i18n: options.i18n,
	});
	return Object.keys(profiles).sort();
}

export function validateMessages(options: {
	customTranslations?: Record<string, Partial<Translations>>;
	i18n?: C15TOptions['i18n'];
	policies?: PolicyConfig[]; // internal param name for backend runtime policies
}): {
	profiles: string[];
	errors: string[];
	warnings: string[];
} {
	const profiles = normalizeProfiles({
		customTranslations: options.customTranslations,
		i18n: options.i18n,
	});
	const profileNames = Object.keys(profiles);
	const defaultProfile = options.i18n?.defaultProfile ?? DEFAULT_PROFILE;
	const errors: string[] = [];
	const warnings: string[] = [];

	if (
		options.customTranslations &&
		Object.keys(options.customTranslations).length > 0
	) {
		warnings.push(
			'`customTranslations` is deprecated. Migrate to `i18n.messages`.'
		);
	}

	if (profileNames.length > 0 && !profiles[defaultProfile]) {
		warnings.push(
			`Default i18n profile '${defaultProfile}' is not configured. Fallbacks may skip expected default profile behavior.`
		);
	}

	for (const policy of options.policies ?? []) {
		if (!policy.i18n) {
			continue;
		}

		const profile = resolveActiveProfile({
			profiles,
			defaultProfile,
			policyProfile: policy.i18n.messageProfile,
		});
		const language = normalizeLanguage(policy.i18n.language);

		if (policy.i18n.messageProfile && !profiles[policy.i18n.messageProfile]) {
			errors.push(
				`Policy '${policy.id}' references missing i18n profile '${policy.i18n.messageProfile}'.`
			);
		}

		if (!policy.i18n.messageProfile && !policy.i18n.language) {
			warnings.push(
				`Policy '${policy.id}' defines i18n without language or messageProfile. Runtime will use request language + default profile.`
			);
		}

		if (!language) {
			continue;
		}

		const fallbackLanguage =
			profileNames.length > 0
				? resolveFallbackLanguage({ profile: profiles[profile] })
				: 'en';
		const hasProfileLanguage =
			!!profiles[profile]?.translations[language] ||
			!!profiles[profile]?.translations[fallbackLanguage];
		const hasBaseLanguage =
			profileNames.length === 0 && isSupportedBaseLanguage(language);

		if (!hasProfileLanguage && !hasBaseLanguage) {
			errors.push(
				`Policy '${policy.id}' i18n language '${language}' has no configured translation in profile '${profile}', and no configured fallback exists.`
			);
		}
	}

	return {
		profiles: profileNames.sort(),
		errors,
		warnings,
	};
}

/**
 * Gets the translations data for a given language, resolving optional policy
 * profile/language hints and compatibility aliases.
 *
 * Fallback order:
 * 1) profile + language
 * 2) profile + fallback language
 */
export function getTranslationsData(
	acceptLanguage: string | null,
	customTranslations?: Record<string, Partial<Translations>>,
	options?: TranslationResolutionOptions
) {
	const profiles = normalizeProfiles({
		customTranslations,
		i18n: options?.i18n,
		logger: options?.logger,
	});
	const defaultProfile = options?.i18n?.defaultProfile ?? DEFAULT_PROFILE;
	const profile = resolveActiveProfile({
		profiles,
		defaultProfile,
		policyProfile: options?.policyI18n?.messageProfile,
		logger: options?.logger,
	});

	const configuredLanguages =
		Object.keys(profiles).length > 0
			? getSelectableLanguages({
					profiles,
					profile,
				})
			: Object.keys(baseTranslations);
	const fallbackLanguage =
		Object.keys(profiles).length > 0
			? resolveFallbackLanguage({ profile: profiles[profile] })
			: 'en';

	const policyLanguage = normalizeLanguage(options?.policyI18n?.language);
	const requestedLanguage =
		policyLanguage ??
		selectLanguage(configuredLanguages, {
			header: acceptLanguage,
			fallback: fallbackLanguage,
		});

	const candidates = buildCandidates({
		language: requestedLanguage,
		fallbackLanguage,
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
				requestedProfile: profile,
				requestedLanguage,
				resolvedProfile: profile,
				resolvedLanguage: selectedCandidate.language,
			}
		);
	}

	let language = selectedCandidate?.language ?? requestedLanguage;
	if (!selectedCandidate && !isSupportedBaseLanguage(language)) {
		warnOnce(
			options?.logger,
			`i18n.base-fallback:${language}`,
			`No translation found for '${language}'. Falling back to base English translations.`
		);
		language = 'en';
	}

	const base = isSupportedBaseLanguage(language)
		? baseTranslations[language]
		: baseTranslations.en;
	const custom = selectedCandidate
		? profiles[profile]?.translations[selectedCandidate.language]
		: undefined;
	const translations = custom ? deepMergeTranslations(base, custom) : base;

	return {
		translations: translations as CompleteTranslations,
		language,
	};
}

/**
 * Gets the translations for a given language from options.
 */
export async function getTranslations(
	acceptLanguage: string,
	options: {
		customTranslations?: Record<string, Partial<Translations>>;
		i18n?: C15TOptions['i18n'];
		policyI18n?: PolicyConfig['i18n'];
		logger?: LoggerLike;
	}
) {
	return getTranslationsData(acceptLanguage, options.customTranslations, {
		i18n: options.i18n,
		policyI18n: options.policyI18n,
		logger: options.logger,
	});
}
