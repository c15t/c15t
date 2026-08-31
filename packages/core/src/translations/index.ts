import type { TranslationConfig } from '@c15t/translations';
import { enTranslations } from '@c15t/translations';

export const defaultTranslationConfig: TranslationConfig = {
	defaultLanguage: 'en',
	disableAutoLanguageSwitch: false,
	translations: {
		en: enTranslations,
	},
};
