import {
	type CompleteTranslations,
	deepMergeTranslations,
	selectLanguage,
	type Translations,
} from '@c15t/translations';
import { baseTranslations } from '@c15t/translations/all';

import { validatePolicyI18nConfig } from './policy-i18n-validation';
import type { PolicyConfig } from './policy-runtime';

type SupportedBaseLanguage = Extract<keyof typeof baseTranslations, string>;

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
	i18n?: I18nOptions;
	policyI18n?: PolicyConfig['i18n'];
	logger?: LoggerLike;
}

interface TranslationCandidate {
	language: string;
	reason: 'profile_language' | 'profile_fallback';
}

const DEFAULT_PROFILE = 'default';
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
	i18n?: I18nOptions;
}): string[] {
	const profiles = normalizeProfiles({
		customTranslations: options.customTranslations,
		i18n: options.i18n,
	});
	return Object.keys(profiles).sort();
}

export function validateMessages(options: {
	customTranslations?: Record<string, Partial<Translations>>;
	i18n?: I18nOptions;
	policies?: PolicyConfig[];
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
}

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

export async function getTranslations(
	acceptLanguage: string,
	options: {
		customTranslations?: Record<string, Partial<Translations>>;
		i18n?: I18nOptions;
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
