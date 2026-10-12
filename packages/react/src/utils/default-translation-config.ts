import type { TranslationConfig } from '@c15t/translations';
import { translations as enTranslations } from '@c15t/translations/en';

export const defaultTranslationConfig = {
	defaultLanguage: 'en',
	translations: {
		en: enTranslations,
	},
} satisfies TranslationConfig;
