import { enTranslations } from '@c15t/translations';
import {
	deepMergeTranslations,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	prepareTranslationConfig,
} from 'c15t';
import { bench, run } from 'mitata';

// Sample partial override (simulates user customization)
const partialOverride = {
	cookieBanner: {
		title: 'Custom Title',
		description: 'Custom description text',
	},
};

// Larger partial override (more realistic)
const largerOverride = {
	cookieBanner: {
		title: 'Custom Cookie Notice',
		description: 'We use cookies to improve your experience.',
		acceptButton: 'Accept All',
		rejectButton: 'Reject All',
		customizeButton: 'Customize',
	},
	common: {
		close: 'Close',
		save: 'Save Preferences',
	},
};

// Sample full translation config
const baseConfig = {
	defaultLanguage: 'en',
	translations: { en: enTranslations },
};

const overrideConfig = {
	defaultLanguage: 'en',
	translations: { en: partialOverride },
};

const largerOverrideConfig = {
	defaultLanguage: 'en',
	translations: { en: largerOverride },
};

// Multi-language config
const multiLangConfig = {
	defaultLanguage: 'en',
	translations: {
		en: enTranslations,
		de: partialOverride,
		fr: partialOverride,
		es: partialOverride,
	},
};

// Deep merge benchmarks
bench('deepMergeTranslations - shallow override (2 keys)', () => {
	deepMergeTranslations(enTranslations, partialOverride);
});

bench('deepMergeTranslations - larger override (7 keys)', () => {
	deepMergeTranslations(enTranslations, largerOverride);
});

bench('deepMergeTranslations - full override (same as base)', () => {
	deepMergeTranslations(enTranslations, enTranslations);
});

bench('deepMergeTranslations - empty override', () => {
	deepMergeTranslations(enTranslations, {});
});

// Config merging benchmarks
bench('mergeTranslationConfigs - single language', () => {
	mergeTranslationConfigs(baseConfig, overrideConfig);
});

bench('mergeTranslationConfigs - single language (larger override)', () => {
	mergeTranslationConfigs(baseConfig, largerOverrideConfig);
});

bench('mergeTranslationConfigs - no custom config', () => {
	mergeTranslationConfigs(baseConfig, undefined);
});

// Language detection benchmarks
bench('detectBrowserLanguage - with matching language', () => {
	detectBrowserLanguage({ en: {}, de: {}, fr: {} }, 'en', false);
});

bench('detectBrowserLanguage - with auto-switch disabled', () => {
	detectBrowserLanguage({ en: {}, de: {}, fr: {} }, 'en', true);
});

bench('detectBrowserLanguage - fallback to default', () => {
	detectBrowserLanguage({ en: {} }, 'en', false);
});

// Full pipeline benchmarks
bench('prepareTranslationConfig - single language', () => {
	prepareTranslationConfig(baseConfig, overrideConfig);
});

bench('prepareTranslationConfig - no custom config', () => {
	prepareTranslationConfig(baseConfig, undefined);
});

bench('prepareTranslationConfig - multi-language (4 languages)', () => {
	prepareTranslationConfig(multiLangConfig, overrideConfig);
});

await run();
