import { defaultTranslationConfig } from '../../../packages/react/src/index';
import type { ConsentManagerOptions } from '../../../packages/react/src/index';

export const benchmarkConsentOptions: ConsentManagerOptions = {
	consentCategories: ['necessary', 'functionality', 'measurement', 'marketing'],
	mode: 'offline',
	translations: {
		language: 'en',
		translations: defaultTranslationConfig.translations.en,
	},
};
