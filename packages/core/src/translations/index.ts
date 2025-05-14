import type { TranslationConfig } from '@c15t/translations';
import { enTranslations } from '@c15t/translations';

export const defaultTranslationConfig: TranslationConfig = {
	translations: {
		en: enTranslations,
	},
	defaultLanguage: 'en',
	disableAutoLanguageSwitch: false,
};
