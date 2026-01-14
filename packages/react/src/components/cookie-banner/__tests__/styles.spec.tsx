import { defaultTranslationConfig } from 'c15t';
import { test, vi } from 'vitest';
import { CookieBanner } from '~/components/cookie-banner/cookie-banner';
import testComponentStyles from '~/utils/test-helpers';

vi.mock('~/hooks/use-consent-manager', () => ({
	useConsentManager: () => ({
		showPopup: true,
		model: 'opt-in',
		translationConfig: {
			defaultLanguage: 'en',
		},
		saveConsents: vi.fn(),
		setShowPopup: vi.fn(),
		setIsPrivacyDialogOpen: vi.fn(),
		setConsent: vi.fn(),
	}),
}));

vi.mock('~/hooks/use-translations', () => ({
	useTranslations: () => defaultTranslationConfig.translations.en!,
}));

vi.mock('~/hooks/use-text-direction', () => ({
	useTextDirection: vi.fn().mockReturnValue('ltr'),
}));

type ComponentTestCase = {
	testId: string;
	themeKey: string;
	styles: string;
};

const ALL_COMPONENTS: ComponentTestCase[] = [
	{
		testId: 'cookie-banner-root',
		themeKey: 'banner',
		styles: 'custom-root',
	},
	{
		testId: 'cookie-banner-card',
		themeKey: 'bannerCard',
		styles: 'custom-card',
	},
	{
		testId: 'cookie-banner-header',
		themeKey: 'bannerHeader',
		styles: 'custom-header',
	},
	{
		testId: 'cookie-banner-title',
		themeKey: 'bannerTitle',
		styles: 'custom-title',
	},
	{
		testId: 'cookie-banner-description',
		themeKey: 'bannerDescription',
		styles: 'custom-description',
	},
	{
		testId: 'cookie-banner-footer',
		themeKey: 'bannerFooter',
		styles: 'custom-footer',
	},
	{
		testId: 'cookie-banner-overlay',
		themeKey: 'bannerOverlay',
		styles: 'custom-overlay',
	},
];

test('should apply string classNames from theme prop to all banner elements', async () => {
	const theme = {
		slots: ALL_COMPONENTS.reduce((acc: any, { themeKey, styles }) => {
			acc[themeKey] = styles;
			return acc;
		}, {} as any),
	};

	await testComponentStyles({
		component: <CookieBanner />,
		theme,
		testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({ testId, styles })),
	});
});

test('should apply object styles and classNames from theme prop to all banner elements', async () => {
	const theme = {
		slots: ALL_COMPONENTS.reduce((acc: any, { themeKey, styles }) => {
			acc[themeKey] = {
				className: styles,
				style: { border: '1px solid red' },
			};
			return acc;
		}, {} as any),
	};

	await testComponentStyles({
		component: <CookieBanner />,
		theme,
		testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({
			testId,
			styles: { className: styles, style: { border: '1px solid red' } },
		})),
	});
});
