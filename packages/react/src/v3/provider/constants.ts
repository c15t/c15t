import type { KernelTranslations } from 'c15t/v3';
import { defaultTranslationConfig } from '../utils/default-translation-config';

export const ALL_CONSENTS_ON = {
	necessary: true,
	functionality: true,
	marketing: true,
	measurement: true,
	experience: true,
} as const;

export const DEFAULT_TRANSLATIONS: KernelTranslations = {
	language: 'en',
	translations: defaultTranslationConfig.translations.en as never,
};
