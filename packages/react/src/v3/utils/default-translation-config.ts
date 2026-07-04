import type { TranslationConfig } from '@c15t/translations';
import { translations as enTranslations } from '@c15t/translations/en';

export const defaultTranslationConfig = {
	translations: {
		en: enTranslations,
	},
	defaultLanguage: 'en',
} satisfies TranslationConfig;
