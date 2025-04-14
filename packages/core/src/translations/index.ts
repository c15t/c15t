import type { TranslationConfig } from '../types/translations';
import { enTranslations } from './en';

export const defaultTranslationConfig: TranslationConfig = {
	translations: {
		en: enTranslations,
	},
	defaultLanguage: 'en',
	disableAutoLanguageSwitch: false,
};
