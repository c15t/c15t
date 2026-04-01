import type { Script, Translations } from 'c15t';
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

function createScripts(count: number): Script[] {
	return Array.from({ length: count }, (_, index) => {
		const category =
			SUPPORTED_CONSENT_CATEGORIES[
				index % SUPPORTED_CONSENT_CATEGORIES.length
			] ?? 'measurement';
		return {
			id: `script-${index + 1}`,
			src: `https://cdn.example.com/script-${index + 1}.js`,
			category,
		};
	});
}

function createTranslations(
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
				rejectAll: `Reject All ${locale}`,
				customize: `Customize ${locale}`,
				save: `Save ${locale}`,
			},
			cookieBanner: {
				title: `Consent Banner ${locale}`,
				description: `Benchmark fixture translation payload for ${locale}.`,
			},
			consentManagerDialog: {
				title: `Preference Center ${locale}`,
				description: `Benchmark fixture preference center payload for ${locale}.`,
			},
		};
	}

	return entries;
}

function createFixture(
	name: string,
	consentCount: number,
	scriptCount: number,
	localeCount: number,
	themeComplexity: 'minimal' | 'complex'
): CoreBenchmarkFixture {
	return {
		name,
		consentCount,
		scriptCount,
		localeCount,
		themeComplexity,
		consentCategories: [
			...SUPPORTED_CONSENT_CATEGORIES.slice(
				0,
				Math.min(consentCount, SUPPORTED_CONSENT_CATEGORIES.length)
			),
		],
		scripts: createScripts(scriptCount),
		translations: createTranslations(localeCount),
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
	};
}

export const coreFixtures = {
	tiny: createFixture('tiny', 3, 0, 1, 'minimal'),
	small: createFixture('small', 8, 3, 4, 'minimal'),
	medium: createFixture('medium', 15, 7, 8, 'minimal'),
	large: createFixture('large', 30, 15, 16, 'complex'),
	xlarge: createFixture('xlarge', 30, 30, 34, 'complex'),
} satisfies Record<string, CoreBenchmarkFixture>;

export const browserScenarios = [
	'client',
	'ssr',
	'prefetch',
	'headless',
	'full-ui',
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
