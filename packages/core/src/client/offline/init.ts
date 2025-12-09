import {
	deepMergeTranslations,
	enTranslations,
	selectLanguage,
	type TranslationConfig,
	type Translations,
} from '@c15t/translations';
import { checkJurisdiction } from '~/libs/jurisdiction';
import { defaultTranslationConfig } from '~/translations';
import type { InitResponse } from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { createResponseContext } from './utils';

/**
 * Checks if a consent banner should be shown.
 * In offline mode, will always return true unless localStorage or cookie has a value.
 */
export async function init(
	initialTranslationConfig?: Partial<TranslationConfig>,
	options?: FetchOptions<InitResponse>
): Promise<ResponseContext<InitResponse>> {
	// Check localStorage and cookie to see if the banner has been shown
	const country = options?.headers?.['x-c15t-country'] ?? 'GB';
	const region = options?.headers?.['x-c15t-region'] ?? null;

	let language: string;
	let translationsForLanguage: Translations;

	const headerLanguage =
		(options?.headers?.['accept-language'] as string | undefined) ?? null;

	// When a custom translation config is provided (via store options),
	// prefer its languages while always falling back to English strings.
	if (
		initialTranslationConfig?.translations &&
		Object.keys(initialTranslationConfig.translations).length > 0
	) {
		const customTranslations = initialTranslationConfig.translations as Record<
			string,
			Partial<Translations>
		>;

		const availableLanguages = Array.from(
			new Set(['en', ...Object.keys(customTranslations)])
		);

		const fallbackLanguage = initialTranslationConfig.defaultLanguage ?? 'en';

		language = selectLanguage(availableLanguages, {
			header: headerLanguage,
			fallback: fallbackLanguage,
		});

		const customForLanguage = customTranslations[language] ?? {};
		translationsForLanguage = deepMergeTranslations(
			enTranslations,
			customForLanguage as Partial<Translations>
		);
	} else {
		// Fallback to the built-in default translation config (English only)
		const availableLanguages = Object.keys(
			defaultTranslationConfig.translations
		);
		const fallbackLanguage = defaultTranslationConfig.defaultLanguage ?? 'en';

		language = selectLanguage(availableLanguages, {
			header: headerLanguage,
			fallback: fallbackLanguage,
		});

		translationsForLanguage = defaultTranslationConfig.translations[
			language as keyof typeof defaultTranslationConfig.translations
		] as Translations;
	}

	const jurisdictionCode = checkJurisdiction(country);

	const response = createResponseContext<InitResponse>({
		jurisdiction: jurisdictionCode,
		location: { countryCode: country, regionCode: region },
		translations: {
			language,
			translations: translationsForLanguage,
		},
		branding: 'c15t',
	});

	// Call success callback if provided
	if (options?.onSuccess) {
		await options.onSuccess(response);
	}

	return response;
}
