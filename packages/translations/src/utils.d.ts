import type {
	I18nConfig,
	TranslationConfig,
	TranslationInputConfig,
	Translations,
} from './types';
/**
 * Deep merges translation objects
 *
 * This performs a deep merge across all translation sections so that
 * nested overrides (for example, only overriding the title of a consent
 * type) still preserve default values for other keys.
 */
export declare function deepMergeTranslations(
	base: Translations,
	override: Partial<Translations>
): Translations;
/**
 * Parses an Accept-Language header into a list of normalized language codes.
 *
 * The result is ordered by client preference. Each entry is the primary
 * language subtag in lowercase (e.g. "de" from "de-DE").
 */
export declare function parseAcceptLanguage(
	header: string | null | undefined
): string[];
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
export declare function selectLanguage(
	available: string[],
	options?: SelectLanguageOptions
): string;
/**
 * Normalizes legacy translation config and v2 i18n config into a canonical shape.
 *
 * Precedence:
 * - `i18n.*` values take priority when present
 * - Legacy translation config is used as fallback
 */
export declare function normalizeI18nConfig(
	config?: TranslationInputConfig
): I18nConfig;
/**
 * Maps canonical i18n config back to the legacy translation config shape.
 */
export declare function toTranslationConfig(
	config: I18nConfig
): TranslationConfig;
/**
 * Resolves legacy and v2 i18n inputs into a normalized legacy translation config.
 *
 * @param legacyConfig Legacy translation input.
 * @param i18nConfig Preferred v2 i18n input.
 */
export declare function resolveTranslationInput(
	legacyConfig?: Partial<TranslationConfig>,
	i18nConfig?: Partial<I18nConfig>
): TranslationConfig | undefined;
/**
 * Merges custom translations with defaults
 */
export declare function mergeTranslationConfigs(
	defaultConfig: TranslationInputConfig,
	customConfig?: TranslationInputConfig
): TranslationConfig;
/**
 * Detects browser language and returns appropriate default language
 */
export declare function detectBrowserLanguage(
	translations: Record<string, unknown>,
	defaultLanguage: string | undefined,
	disableAutoSwitch?: boolean
): string;
/**
 * Prepares the translation configuration by merging defaults and detecting language
 */
export declare function prepareTranslationConfig(
	defaultConfig: TranslationInputConfig,
	customConfig?: TranslationInputConfig
): TranslationConfig;
export {};
