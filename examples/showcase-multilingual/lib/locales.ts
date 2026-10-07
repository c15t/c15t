export const locales = ['en', 'de', 'fr'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const isLocale = (value: string): value is Locale =>
	(locales as readonly string[]).includes(value);

/**
 * The highest-quality supported language in an `Accept-Language` header,
 * using header order to break ties, or the default locale.
 */
export const matchLocale = (acceptLanguage: string | null): Locale => {
	let matched: Locale = defaultLocale;
	let highestQuality = 0;
	for (const entry of acceptLanguage?.split(',') ?? []) {
		const [language, ...parameters] = entry.toLowerCase().split(';');
		const primary = language?.trim().split('-')[0] ?? '';
		if (!isLocale(primary)) {
			continue;
		}
		const weight = parameters
			.map((parameter) => parameter.trim())
			.find((parameter) => parameter.startsWith('q='));
		const quality = weight === undefined ? 1 : Number(weight.slice(2));
		if (quality > highestQuality && quality <= 1) {
			matched = primary;
			highestQuality = quality;
		}
	}
	return matched;
};
