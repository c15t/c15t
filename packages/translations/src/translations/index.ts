import { translations as bg } from './bg';
import { translations as cs } from './cs';
import { translations as da } from './da';
import { translations as de } from './de';
import { translations as el } from './el';
import { translations as en } from './en';
import { translations as es } from './es';
import { translations as et } from './et';
import { translations as fi } from './fi';
import { translations as fr } from './fr';
import { translations as ga } from './ga';
import { translations as he } from './he';
import { translations as hr } from './hr';
import { translations as hu } from './hu';
import { translations as id } from './id';
import { translations as it } from './it';
import { translations as lt } from './lt';
import { translations as lv } from './lv';
import { translations as mt } from './mt';
import { translations as nl } from './nl';
import { translations as pl } from './pl';
import { translations as pt } from './pt';
import { translations as ro } from './ro';
import { translations as sk } from './sk';
import { translations as sl } from './sl';
import { translations as sv } from './sv';
import { translations as zh } from './zh';

/**
 * Base translations object containing all available language translations.
 *
 * Maps ISO 639-1 language codes to their respective translation objects.
 * Includes all 24 official languages of the European Union as well as additional languages.
 *
 * + * @example
 * ```typescript
 * import { baseTranslations } from '@c15t/translations';
 * const english = baseTranslations.en;
 * const german = baseTranslations.de;
 * ```
 */
const baseTranslations = {
	bg,
	cs,
	da,
	de,
	el,
	en,
	es,
	et,
	fi,
	fr,
	ga,
	he,
	hr,
	hu,
	id,
	it,
	lt,
	lv,
	mt,
	nl,
	pl,
	pt,
	ro,
	sk,
	sl,
	sv,
	zh,
} as const;

/**
 * Type alias for the base translations object.
 *
 * Represents the readonly type of {@link baseTranslations}, providing type-safe
 * access to all available language translations.
 *
 * @example
 * ```ts
 * import type { BaseTranslations } from '@c15t/translations';
 *
 * function processTranslations(translations: BaseTranslations) {
 *   // Type-safe access to translations
 *   const english = translations.en;
 * }
 * ```
 */
type BaseTranslations = typeof baseTranslations;

export { baseTranslations };
export type { BaseTranslations };
