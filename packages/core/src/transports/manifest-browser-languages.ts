/**
 * Base copy for every language but English, one `import()` each. The
 * browser manifest resolver loads this module only when a visitor resolves
 * to another language, so first-load JavaScript carries a single `import()`
 * instead of one per language.
 *
 * @internal
 */
import type { Translations } from '@c15t/translations';

import type { OtherLanguage } from './manifest-browser-resolve';

type LanguageModule = Promise<{ translations: Translations }>;

/**
 * One `import()` per language, each with a literal specifier, so a bundler
 * splits every language into a chunk of its own. The record type makes a
 * language added to `@c15t/translations` a type error here until it is
 * listed.
 */
const languageModules: Record<OtherLanguage, () => LanguageModule> = {
	bg: () => import('@c15t/translations/bg'),
	cs: () => import('@c15t/translations/cs'),
	cy: () => import('@c15t/translations/cy'),
	da: () => import('@c15t/translations/da'),
	de: () => import('@c15t/translations/de'),
	el: () => import('@c15t/translations/el'),
	es: () => import('@c15t/translations/es'),
	et: () => import('@c15t/translations/et'),
	fi: () => import('@c15t/translations/fi'),
	fr: () => import('@c15t/translations/fr'),
	ga: () => import('@c15t/translations/ga'),
	gu: () => import('@c15t/translations/gu'),
	he: () => import('@c15t/translations/he'),
	hi: () => import('@c15t/translations/hi'),
	hr: () => import('@c15t/translations/hr'),
	hu: () => import('@c15t/translations/hu'),
	id: () => import('@c15t/translations/id'),
	is: () => import('@c15t/translations/is'),
	it: () => import('@c15t/translations/it'),
	lb: () => import('@c15t/translations/lb'),
	lt: () => import('@c15t/translations/lt'),
	lv: () => import('@c15t/translations/lv'),
	mt: () => import('@c15t/translations/mt'),
	nb: () => import('@c15t/translations/nb'),
	nl: () => import('@c15t/translations/nl'),
	nn: () => import('@c15t/translations/nn'),
	pl: () => import('@c15t/translations/pl'),
	pt: () => import('@c15t/translations/pt'),
	rm: () => import('@c15t/translations/rm'),
	ro: () => import('@c15t/translations/ro'),
	sk: () => import('@c15t/translations/sk'),
	sl: () => import('@c15t/translations/sl'),
	sv: () => import('@c15t/translations/sv'),
	zh: () => import('@c15t/translations/zh'),
};

const loading = new Map<string, Promise<Translations | undefined>>();

/**
 * Load one language's base copy, once per page.
 *
 * @param language - A language other than English.
 * @returns The language's copy, or `undefined` when its chunk fails to
 * load. A later call tries again.
 * @internal
 */
export const loadLanguageCopy = function loadLanguageCopy(
	language: OtherLanguage
): Promise<Translations | undefined> {
	let pending = loading.get(language);
	if (!pending) {
		pending = (async () => {
			try {
				const { translations } = await languageModules[language]();
				return translations;
			} catch {
				loading.delete(language);
				return undefined;
			}
		})();
		loading.set(language, pending);
	}
	return pending;
};
