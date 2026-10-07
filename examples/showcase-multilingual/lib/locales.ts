export const locales = ['en', 'de', 'fr'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const isLocale = (value: string): value is Locale =>
	(locales as readonly string[]).includes(value);

const matchLanguageRange = (range: string) => {
	if (range === '*') {
		return range;
	}
	const primary = range.split('-')[0] ?? '';
	return isLocale(primary) ? primary : undefined;
};

/**
 * The highest-quality supported language in an `Accept-Language` header,
 * using header order to break ties. Explicit language weights override the
 * wildcard; the default locale is used when none is acceptable.
 */
export const matchLocale = (acceptLanguage: string | null): Locale => {
	const preferences = new Map<
		Locale | '*',
		{ position: number; quality: number }
	>();
	for (const [position, entry] of (
		acceptLanguage?.split(',') ?? []
	).entries()) {
		const [language, ...parameters] = entry.toLowerCase().split(';');
		const primary = matchLanguageRange(language?.trim() ?? '');
		if (!primary) {
			continue;
		}
		const weight = parameters
			.map((parameter) => parameter.trim())
			.find((parameter) => parameter.startsWith('q='));
		const quality = weight === undefined ? 1 : Number(weight.slice(2));
		if (!(quality >= 0 && quality <= 1)) {
			continue;
		}
		const preference = preferences.get(primary);
		if (!preference || quality > preference.quality) {
			preferences.set(primary, { position, quality });
		}
	}

	let matched: Locale = defaultLocale;
	let highestQuality = 0;
	let firstPosition = Infinity;
	for (const locale of locales) {
		const preference = preferences.get(locale) ?? preferences.get('*');
		if (!preference || preference.quality === 0) {
			continue;
		}
		if (
			preference.quality > highestQuality ||
			(preference.quality === highestQuality &&
				preference.position < firstPosition)
		) {
			matched = locale;
			highestQuality = preference.quality;
			firstPosition = preference.position;
		}
	}
	return matched;
};
