import {
	type ConsentManagerOptions,
	defaultTranslationConfig,
} from '../../../packages/react/src/index';

export const benchmarkConsentOptions: ConsentManagerOptions = {
	mode: 'offline',
	consentCategories: ['necessary', 'functionality', 'measurement', 'marketing'],
	translations: {
		language: 'en',
		translations: defaultTranslationConfig.translations.en,
	},
};
