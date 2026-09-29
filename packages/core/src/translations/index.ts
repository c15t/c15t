import type { TranslationConfig, Translations } from '@c15t/translations';
import { deepMergeTranslations, enTranslations } from '@c15t/translations';

import type { KernelTranslations } from '../types';

export const defaultTranslationConfig: TranslationConfig = {
	defaultLanguage: 'en',
	disableAutoLanguageSwitch: false,
	translations: {
		en: enTranslations,
	},
};

/**
 * Message overrides an app declares in code, keyed by language, as in
 * `i18n.messages`.
 */
export type TranslationOverrides = Readonly<
	Record<string, Partial<Translations> | undefined>
>;

/**
 * Pick the overrides declared for a language: an exact key first, then its
 * primary subtag (`de` for `de-AT`). Own keys only, so a language named
 * `constructor` never reads the prototype.
 *
 * @param overrides - Overrides keyed by language.
 * @param language - The language to look up.
 * @returns The overrides for that language, or `undefined`.
 */
export const selectTranslationOverride = function selectTranslationOverride(
	overrides: TranslationOverrides | undefined,
	language: string
): Partial<Translations> | undefined {
	if (!overrides) {
		return undefined;
	}
	if (Object.hasOwn(overrides, language)) {
		return overrides[language];
	}
	const primary = language.split('-')[0]?.toLowerCase();
	if (primary && primary !== language && Object.hasOwn(overrides, primary)) {
		return overrides[primary];
	}
	return undefined;
};

/**
 * Apply an app's message overrides on top of resolved translations.
 *
 * The resolved bundle (from a backend, a manifest, a prefetch or the bundled
 * defaults) is the base for its language. The app's overrides for that same
 * language replace individual keys on top, so a developer's code-level
 * override is never discarded by a backend response. Overrides for other
 * languages are ignored: mixing languages is worse than showing the base.
 *
 * @param translations - The resolved translations for one language.
 * @param overrides - Message overrides keyed by language.
 * @returns The merged translations, or the input unchanged when no override
 * applies to its language.
 * @example
 * ```ts
 * applyTranslationOverrides(
 * 	{ language: 'en', translations: backendCopy },
 * 	{ en: { cookieBanner: { title: 'Your privacy' } } }
 * );
 * ```
 */
export const applyTranslationOverrides = function applyTranslationOverrides(
	translations: KernelTranslations,
	overrides: TranslationOverrides | undefined
): KernelTranslations {
	const selected = selectTranslationOverride(overrides, translations.language);
	if (!selected) {
		return translations;
	}
	return {
		...translations,
		translations: {
			// Keep any section the merge helper does not know about.
			...translations.translations,
			...deepMergeTranslations(
				translations.translations as Translations,
				selected
			),
		} as KernelTranslations['translations'],
	};
};

/**
 * Resolve copy for a language from what the client has on hand: the bundled
 * translations for it, the app's overrides for it, or both.
 *
 * Used where no backend answers, such as offline mode switching language. A
 * language with neither bundled copy nor app overrides resolves to
 * `undefined`, so the caller keeps its current copy instead of labelling
 * another language's text with this one.
 *
 * @param language - The requested language.
 * @param overrides - Message overrides keyed by language.
 * @returns Translations for that language, or `undefined` when none exist.
 */
export const resolveLocalTranslations = function resolveLocalTranslations(
	language: string,
	overrides: TranslationOverrides | undefined
): KernelTranslations | undefined {
	const bundle = defaultTranslationConfig.translations;
	const bundled = Object.hasOwn(bundle, language)
		? (bundle[language] as Translations)
		: undefined;
	const selected = selectTranslationOverride(overrides, language);
	if (!(bundled || selected)) {
		return undefined;
	}
	const base = bundled ?? (bundle.en as Translations);
	return {
		language,
		translations: (selected
			? deepMergeTranslations(base, selected)
			: base) as KernelTranslations['translations'],
	};
};
