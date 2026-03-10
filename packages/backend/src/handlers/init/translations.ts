import {
	type CompleteTranslations,
	deepMergeTranslations,
	selectLanguage,
	type Translations,
} from '@c15t/translations';
import { baseTranslations } from '@c15t/translations/all';
import type { C15TOptions, I18nMessageProfiles, PolicyConfig } from '~/types';

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
	profile: string;
	language: string;
	reason:
		| 'profile_language'
		| 'profile_english'
		| 'default_language'
		| 'default_english';
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
		return { [DEFAULT_PROFILE]: legacy };
	}

	return {};
}

function buildCandidates(input: {
	profile: string;
	defaultProfile: string;
	language: string;
}): TranslationCandidate[] {
	const raw: TranslationCandidate[] = [
		{
			profile: input.profile,
			language: input.language,
			reason: 'profile_language',
		},
		{
			profile: input.profile,
			language: 'en',
			reason: 'profile_english',
		},
		{
			profile: input.defaultProfile,
			language: input.language,
			reason: 'default_language',
		},
		{
			profile: input.defaultProfile,
			language: 'en',
			reason: 'default_english',
		},
	];

	const dedupe = new Set<string>();
	return raw.filter((candidate) => {
		const key = `${candidate.profile}:${candidate.language}`;
		if (dedupe.has(key)) {
			return false;
		}
		dedupe.add(key);
		return true;
	});
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

		const profile = policy.i18n.messageProfile ?? defaultProfile;
		const language = normalizeLanguage(policy.i18n.language);

		if (policy.i18n.messageProfile && !profiles[profile]) {
			errors.push(
				`Policy '${policy.id}' references missing i18n profile '${profile}'.`
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

		const hasProfileLanguage =
			!!profiles[profile]?.[language] || !!profiles[profile]?.en;
		const hasDefaultLanguage =
			!!profiles[defaultProfile]?.[language] || !!profiles[defaultProfile]?.en;
		const hasBaseLanguage = isSupportedBaseLanguage(language);

		if (!hasProfileLanguage && !hasDefaultLanguage && !hasBaseLanguage) {
			errors.push(
				`Policy '${policy.id}' i18n language '${language}' has no configured translation in profile '${profile}' or default profile '${defaultProfile}', and no base translation exists.`
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
 * 2) profile + en
 * 3) default profile + language
 * 4) default profile + en
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
	const profile = options?.policyI18n?.messageProfile ?? defaultProfile;

	if (options?.policyI18n?.messageProfile && !profiles[profile]) {
		warnOnce(
			options.logger,
			`i18n.profile.missing:${profile}`,
			`Policy i18n profile '${profile}' does not exist. Falling back to default profile '${defaultProfile}'.`
		);
	}

	const configuredLanguages = [
		...new Set([
			...Object.keys(baseTranslations),
			...Object.values(profiles).flatMap((messages) => Object.keys(messages)),
		]),
	];

	const policyLanguage = normalizeLanguage(options?.policyI18n?.language);
	const requestedLanguage =
		policyLanguage ??
		selectLanguage(configuredLanguages, {
			header: acceptLanguage,
			fallback: 'en',
		});

	const candidates = buildCandidates({
		profile,
		defaultProfile,
		language: requestedLanguage,
	});

	const selectedCandidate = candidates.find(
		(candidate) => !!profiles[candidate.profile]?.[candidate.language]
	);

	if (selectedCandidate && selectedCandidate.reason !== 'profile_language') {
		warnOnce(
			options?.logger,
			`i18n.fallback:${profile}:${requestedLanguage}:${selectedCandidate.profile}:${selectedCandidate.language}`,
			`Policy translation fallback used (${selectedCandidate.reason}).`,
			{
				requestedProfile: profile,
				requestedLanguage,
				resolvedProfile: selectedCandidate.profile,
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
		? profiles[selectedCandidate.profile]?.[selectedCandidate.language]
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
