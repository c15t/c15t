export const locales = ['en', 'de', 'fr'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const isLocale = (value: string): value is Locale =>
	(locales as readonly string[]).includes(value);

/**
 * The first supported language in an `Accept-Language` header, ignoring
 * q-values beyond their order, or the default locale.
 */
export const matchLocale = (acceptLanguage: string | null): Locale => {
	for (const entry of acceptLanguage?.split(',') ?? []) {
		const primary = entry.trim().split(/[-;]/u)[0]?.toLowerCase() ?? '';
		if (isLocale(primary)) {
			return primary;
		}
	}
	return defaultLocale;
};
