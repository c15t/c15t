import { translations as enTranslations } from './translations/en';
import type { Translations } from './types';

/**
 * Keyed on a global symbol so every copy of this module, including one
 * duplicated into another bundle chunk, shares the same registry.
 */
const REGISTRY_KEY = Symbol.for('c15t.stockTranslations');

type StockRegistry = Map<string, Translations>;

const getRegistry = function getRegistry(): StockRegistry {
	const holder = globalThis as typeof globalThis & {
		[REGISTRY_KEY]?: StockRegistry;
	};
	holder[REGISTRY_KEY] ??= new Map([['en', enTranslations]]);
	return holder[REGISTRY_KEY];
};

/**
 * Record c15t's built-in copy for some languages.
 *
 * `@c15t/translations/all` registers every bundled language when it loads,
 * and English is always registered. Code that merges app messages over
 * backend copy reads this to tell a stock string, which should not shadow
 * a backend edit, from a customized one.
 *
 * @param translations - Built-in copy keyed by language.
 * @internal
 */
export const registerStockTranslations = function registerStockTranslations(
	translations: Readonly<Record<string, Translations>>
): void {
	const registry = getRegistry();
	for (const [language, copy] of Object.entries(translations)) {
		registry.set(language, copy);
	}
};

/**
 * c15t's built-in copy for a language, when it has been registered.
 *
 * @param language - The language code, for example `de`.
 * @returns The built-in copy, or `undefined` when it is not loaded.
 */
export const getStockTranslations = function getStockTranslations(
	language: string
): Translations | undefined {
	return getRegistry().get(language);
};
