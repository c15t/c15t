import type { TranslationConfig, Translations } from '@c15t/translations';
import {
	deepMergeTranslations,
	enTranslations,
	getStockTranslations,
} from '@c15t/translations';

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
 * primary subtag (`de` for `de-AT`). An exact key set to `undefined` counts
 * as missing. Own keys only, so a language named `constructor` never reads
 * the prototype.
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
	const exact = Object.hasOwn(overrides, language)
		? overrides[language]
		: undefined;
	if (exact) {
		return exact;
	}
	const primary = language.split('-')[0]?.toLowerCase();
	if (primary && primary !== language && Object.hasOwn(overrides, primary)) {
		return overrides[primary];
	}
	return undefined;
};

type TranslationTree = Readonly<Record<string, unknown>>;

const isTree = function isTree(value: unknown): value is TranslationTree {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const sameLeaf = function sameLeaf(left: unknown, right: unknown): boolean {
	if (left === right) {
		return true;
	}
	return (
		Array.isArray(left) &&
		Array.isArray(right) &&
		JSON.stringify(left) === JSON.stringify(right)
	);
};

/**
 * The part of an override that should apply over `base`: every key that
 * differs from c15t's built-in copy, and every key `base` does not supply.
 * A key that repeats the built-in text yields to the base, so passing a
 * stock bundle to enable a language does not hide backend edits.
 */
const pickEffectiveOverride = function pickEffectiveOverride(
	override: TranslationTree,
	stock: TranslationTree | undefined,
	base: TranslationTree | undefined
): Record<string, unknown> | undefined {
	const picked: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(override)) {
		if (value === undefined) {
			continue;
		}
		const stockValue = stock?.[key];
		const baseValue = base?.[key];
		if (isTree(value)) {
			const nested = pickEffectiveOverride(
				value,
				isTree(stockValue) ? stockValue : undefined,
				isTree(baseValue) ? baseValue : undefined
			);
			if (nested) {
				picked[key] = nested;
			}
		} else if (baseValue === undefined || !sameLeaf(value, stockValue)) {
			picked[key] = value;
		}
	}
	return Object.keys(picked).length > 0 ? picked : undefined;
};

/** Built-in copy for a language, falling back to its primary subtag. */
const findStockTranslations = function findStockTranslations(
	language: string
): Translations | undefined {
	const primary = language.split('-')[0]?.toLowerCase();
	return (
		getStockTranslations(language) ??
		(primary ? getStockTranslations(primary) : undefined)
	);
};

/**
 * Apply an app's message overrides on top of resolved translations.
 *
 * The resolved bundle (from a backend, a manifest, a prefetch or the bundled
 * defaults) is the base for its language. An app key replaces the base when
 * it differs from c15t's built-in copy for that language, or when the base
 * does not supply it. A key equal to the built-in text leaves the base alone,
 * so an app passing a stock bundle to enable a language still shows backend
 * edits, while a genuine customization wins. Built-in copy is known for
 * English and, once `@c15t/translations/all` loads, every bundled language;
 * without it every app key counts as a customization. Overrides for other
 * languages are ignored: mixing languages is worse than showing the base.
 *
 * @param translations - The resolved translations for one language.
 * @param overrides - Message overrides keyed by language.
 * @returns The merged translations, or the input unchanged when no override
 * applies.
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
	const effective = pickEffectiveOverride(
		selected as TranslationTree,
		findStockTranslations(translations.language) as TranslationTree | undefined,
		translations.translations as TranslationTree
	);
	if (!effective) {
		return translations;
	}
	return {
		...translations,
		translations: {
			// Keep any section the merge helper does not know about.
			...translations.translations,
			...deepMergeTranslations(
				translations.translations as Translations,
				effective as Partial<Translations>
			),
		} as KernelTranslations['translations'],
	};
};

/**
 * Resolve copy for a language from what the client has on hand: c15t's
 * built-in copy for it, the app's overrides for it, or both.
 *
 * Both fall back to the primary subtag, so `de-AT` uses German copy. English
 * built-in copy is always available; every other bundled language is once
 * `@c15t/translations/all` has loaded. App overrides for a language without
 * built-in copy apply over English.
 *
 * Used where no backend answers, such as offline mode switching language. A
 * language with neither built-in copy nor app overrides resolves to
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
	const bundled = findStockTranslations(language);
	const selected = selectTranslationOverride(overrides, language);
	if (!(bundled || selected)) {
		return undefined;
	}
	const base = bundled ?? enTranslations;
	return {
		language,
		translations: (selected
			? deepMergeTranslations(base, selected)
			: base) as KernelTranslations['translations'],
	};
};
