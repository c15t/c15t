import type { Script, Translations } from '@c15t/core';

import type { BenchmarkFixtureDescriptor } from './schema';

export interface CoreBenchmarkFixture extends BenchmarkFixtureDescriptor {
	consentCategories: string[];
	scripts: Script[];
	translations: Record<string, Partial<Translations>>;
}

const SUPPORTED_CONSENT_CATEGORIES = [
	'necessary',
	'functionality',
	'experience',
	'marketing',
	'measurement',
] as const;

const createScripts = function createScripts(count: number): Script[] {
	return Array.from({ length: count }, (_, index) => {
		const category =
			SUPPORTED_CONSENT_CATEGORIES[
				index % SUPPORTED_CONSENT_CATEGORIES.length
			] ?? 'measurement';
		return {
			category,
			id: `script-${index + 1}`,
			src: `https://cdn.example.com/script-${index + 1}.js`,
		};
	});
};

const createTranslations = function createTranslations(
	localeCount: number
): Record<string, Partial<Translations>> {
	const entries: Record<string, Partial<Translations>> = {};
	const locales = [
		'en',
		'fr',
		'de',
		'es',
		'it',
		'pt',
		'nl',
		'sv',
		'da',
		'fi',
		'pl',
		'cs',
		'sk',
		'sl',
		'hr',
		'hu',
		'ro',
		'bg',
		'el',
		'lt',
		'lv',
		'et',
		'ja',
		'ko',
		'zh',
		'ar',
		'he',
		'tr',
		'uk',
		'no',
		'id',
		'th',
		'vi',
		'sr',
	];

	for (let index = 0; index < localeCount; index += 1) {
		const locale = locales[index] ?? `x-${index + 1}`;
		entries[locale] = {
			common: {
				acceptAll: `Accept All ${locale}`,
				customize: `Customize ${locale}`,
				rejectAll: `Reject All ${locale}`,
				save: `Save ${locale}`,
			},
			consentManagerDialog: {
				description: `Benchmark fixture preference center payload for ${locale}.`,
				title: `Preference Center ${locale}`,
			},
			cookieBanner: {
				description: `Benchmark fixture translation payload for ${locale}.`,
				title: `Consent Banner ${locale}`,
			},
		};
	}

	return entries;
};

const createFixture = function createFixture(
	name: string,
	consentCount: number,
	scriptCount: number,
	localeCount: number,
	themeComplexity: 'minimal' | 'complex'
): CoreBenchmarkFixture {
	return {
		consentCategories: [
			...SUPPORTED_CONSENT_CATEGORIES.slice(
				0,
				Math.min(consentCount, SUPPORTED_CONSENT_CATEGORIES.length)
			),
		],
		consentCount,
		localeCount,
		name,
		notes: [
			...(themeComplexity === 'complex'
				? ['includes heavier theme tokens and translation payloads']
				: []),
			...(consentCount > SUPPORTED_CONSENT_CATEGORIES.length
				? [
						`c15t currently exposes ${SUPPORTED_CONSENT_CATEGORIES.length} built-in consent categories, so larger fixtures scale through translations and script volume rather than additional category names.`,
					]
				: []),
		],
		scriptCount,
		scripts: createScripts(scriptCount),
		themeComplexity,
		translations: createTranslations(localeCount),
	};
};

export const coreFixtures = {
	large: createFixture('large', 30, 15, 16, 'complex'),
	medium: createFixture('medium', 15, 7, 8, 'minimal'),
	small: createFixture('small', 8, 3, 4, 'minimal'),
	tiny: createFixture('tiny', 3, 0, 1, 'minimal'),
	xlarge: createFixture('xlarge', 30, 30, 34, 'complex'),
} satisfies Record<string, CoreBenchmarkFixture>;

export const browserScenarios = [
	'client',
	'ssr',
	'prefetch',
	'headless',
	'full-ui',
	'nextjs-v3-client',
	'nextjs-v3-manifest-ssr',
	'nextjs-v3-repeat',
	'nextjs-v3-ssr',
	'react-v3-full',
	'react-v3-headless',
	'react-v3-repeat',
	'repeat-visitor',
	'vanilla-core',
] as const;

export const bundleScenarios = [
	'baseline',
	'core-only',
	'react-headless',
	'react-banner-only',
	'react-full',
	'nextjs-basic',
	'nextjs-ssr',
] as const;
