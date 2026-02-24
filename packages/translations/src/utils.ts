import { translations as enTranslations } from './translations/en';
import type {
	I18nConfig,
	TranslationConfig,
	TranslationInputConfig,
	Translations,
} from './types';

type TranslationSection =
	| 'common'
	| 'cookieBanner'
	| 'consentManagerDialog'
	| 'consentTypes'
	| 'frame'
	| 'legalLinks'
	| 'iab';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (!value) {
		return false;
	}

	if (typeof value !== 'object') {
		return false;
	}

	if (Array.isArray(value)) {
		return false;
	}

	return true;
}

function deepMergeSection<K extends TranslationSection>(
	baseSection: Translations[K] | undefined,
	overrideSection: Translations[K] | undefined
): Translations[K];

function deepMergeSection<TSection extends Record<string, unknown>>(
	baseSection: TSection | undefined,
	overrideSection: Partial<TSection> | undefined
): TSection {
	if (!baseSection && !overrideSection) {
		return {} as TSection;
	}

	const result: Record<string, unknown> = {};

	if (baseSection) {
		for (const key of Object.keys(baseSection)) {
			result[key] = baseSection[key];
		}
	}

	if (!overrideSection) {
		return result as TSection;
	}

	for (const key of Object.keys(overrideSection)) {
		const overrideValue = overrideSection[key];

		if (overrideValue === undefined) {
			continue;
		}

		const baseValue = baseSection ? baseSection[key] : undefined;
		if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
			result[key] = deepMergeSection(
				baseValue as Record<string, unknown>,
				overrideValue as Record<string, unknown>
			);
		} else {
			result[key] = overrideValue;
		}
	}

	return result as TSection;
}

/**
 * Deep merges translation objects
 *
 * This performs a deep merge across all translation sections so that
 * nested overrides (for example, only overriding the title of a consent
 * type) still preserve default values for other keys.
 */
export function deepMergeTranslations(
	base: Translations,
	override: Partial<Translations>
): Translations {
	const sections: TranslationSection[] = [
		'cookieBanner',
		'consentManagerDialog',
		'common',
		'consentTypes',
		'frame',
		'legalLinks',
		'iab',
	];

	const result: Partial<Translations> = {};

	for (const section of sections) {
		const baseSection = base[section];
		const overrideSection = override[section];

		if (baseSection || overrideSection) {
			result[section] = deepMergeSection(baseSection, overrideSection);
		}
	}

	// All required sections are present on the base translations object,
	// so after merging we can safely treat the result as complete.
	return result as Translations;
}

/**
 * Parses an Accept-Language header into a list of normalized language codes.
 *
 * The result is ordered by client preference. Each entry is the primary
 * language subtag in lowercase (e.g. "de" from "de-DE").
 */
export function parseAcceptLanguage(
	header: string | null | undefined
): string[] {
	if (!header) {
		return [];
	}

	const weightedCandidates = header
		.split(',')
		.map((part, index) => {
			const [rawCode, ...params] = part.split(';');
			const normalizedCode = rawCode?.trim().toLowerCase();
			if (!normalizedCode) {
				return null;
			}

			let quality = 1;
			for (const param of params) {
				const trimmed = param.trim().toLowerCase();
				if (!trimmed.startsWith('q=')) {
					continue;
				}

				const parsed = Number.parseFloat(trimmed.slice(2));
				if (Number.isFinite(parsed)) {
					quality = parsed;
				}
				break;
			}

			return {
				code: normalizedCode.split('-')[0] ?? normalizedCode,
				quality,
				index,
			};
		})
		.filter((candidate): candidate is NonNullable<typeof candidate> =>
			Boolean(candidate)
		)
		.sort((a, b) => {
			if (b.quality !== a.quality) {
				return b.quality - a.quality;
			}
			return a.index - b.index;
		});

	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const candidate of weightedCandidates) {
		if (seen.has(candidate.code)) {
			continue;
		}
		seen.add(candidate.code);
		normalized.push(candidate.code);
	}

	return normalized;
}

interface SelectLanguageOptions {
	header?: string | null;
	fallback?: string;
}

/**
 * Selects the best matching language given an Accept-Language header and
 * a list of available language codes.
 *
 * - Tries languages from the header in order of preference.
 * - Matches on primary language code (e.g. "de" for "de-DE").
 * - Falls back to the provided fallback or "en".
 */
export function selectLanguage(
	available: string[],
	options?: SelectLanguageOptions
): string {
	const fallback = options?.fallback ?? 'en';

	if (!available.length) {
		return fallback;
	}

	const candidates = parseAcceptLanguage(options?.header);

	for (const candidate of candidates) {
		if (available.includes(candidate)) {
			return candidate;
		}
	}

	return fallback;
}

/**
 * Normalizes legacy translation config and v2 i18n config into a canonical shape.
 *
 * Precedence:
 * - `i18n.*` values take priority when present
 * - Legacy translation config is used as fallback
 */
export function normalizeI18nConfig(
	config?: TranslationInputConfig
): I18nConfig {
	const detectBrowserLanguageFromLegacy =
		config?.disableAutoLanguageSwitch === undefined
			? undefined
			: !config.disableAutoLanguageSwitch;

	return {
		messages: config?.i18n?.messages ?? config?.translations ?? {},
		locale: config?.i18n?.locale ?? config?.defaultLanguage,
		detectBrowserLanguage:
			config?.i18n?.detectBrowserLanguage ?? detectBrowserLanguageFromLegacy,
	};
}

/**
 * Maps canonical i18n config back to the legacy translation config shape.
 */
export function toTranslationConfig(config: I18nConfig): TranslationConfig {
	return {
		translations: config.messages,
		defaultLanguage: config.locale,
		disableAutoLanguageSwitch:
			config.detectBrowserLanguage === undefined
				? undefined
				: !config.detectBrowserLanguage,
	};
}

/**
 * Merges custom translations with defaults
 */
export function mergeTranslationConfigs(
	defaultConfig: TranslationInputConfig,
	customConfig?: TranslationInputConfig
): TranslationConfig {
	const normalizedDefault = normalizeI18nConfig(defaultConfig);
	const normalizedCustom = customConfig
		? normalizeI18nConfig(customConfig as TranslationInputConfig)
		: undefined;

	const translations: Record<string, Partial<Translations>> = {
		en: enTranslations,
	};

	const allTranslationSets = [
		normalizedDefault.messages,
		normalizedCustom?.messages,
	];

	for (const translationSet of allTranslationSets) {
		if (!translationSet) {
			continue;
		}

		for (const [lang, trans] of Object.entries(translationSet)) {
			if (!trans) {
				continue;
			}
			const base = translations[lang] || translations.en;
			translations[lang] = deepMergeTranslations(
				base as Translations,
				trans as Partial<Translations>
			);
		}
	}

	return toTranslationConfig({
		messages: translations as Record<string, Partial<Translations>>,
		locale: normalizedCustom?.locale ?? normalizedDefault.locale,
		detectBrowserLanguage:
			normalizedCustom?.detectBrowserLanguage ??
			normalizedDefault.detectBrowserLanguage,
	});
}

/**
 * Detects browser language and returns appropriate default language
 */
export function detectBrowserLanguage(
	translations: Record<string, unknown>,
	defaultLanguage: string | undefined,
	disableAutoSwitch = false
): string {
	if (disableAutoSwitch) {
		return defaultLanguage || 'en';
	}

	if (typeof window === 'undefined') {
		return defaultLanguage || 'en';
	}

	const browserLang = window.navigator.language?.split('-')[0] || '';
	return browserLang && browserLang in translations
		? browserLang
		: defaultLanguage || 'en';
}

/**
 * Prepares the translation configuration by merging defaults and detecting language
 */
export function prepareTranslationConfig(
	defaultConfig: TranslationInputConfig,
	customConfig?: TranslationInputConfig
): TranslationConfig {
	const mergedConfig = mergeTranslationConfigs(defaultConfig, customConfig);
	const normalized = normalizeI18nConfig(mergedConfig);
	const detectBrowser =
		normalized.detectBrowserLanguage === undefined
			? true
			: normalized.detectBrowserLanguage;
	const defaultLanguage = detectBrowserLanguage(
		normalized.messages,
		normalized.locale,
		!detectBrowser
	);
	return toTranslationConfig({
		...normalized,
		locale: defaultLanguage,
	});
}
