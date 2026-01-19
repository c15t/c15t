import { defaultTranslationConfig } from 'c15t';
import { test, vi } from 'vitest';
import { ConsentManagerWidget } from '~/components/consent-manager-widget/consent-manager-widget';
import testComponentStyles from '~/utils/test-helpers';

vi.mock('~/hooks/use-consent-manager', () => ({
	useConsentManager: () => ({
		translationConfig: {
			defaultLanguage: 'en',
		},
		saveConsents: vi.fn(),
		setShowPopup: vi.fn(),
		setIsPrivacyDialogOpen: vi.fn(),
		setConsent: vi.fn(),
		getDisplayedConsents: () => [
			{ name: 'marketing', description: 'Marketing cookies' },
		],
		selectedConsents: { marketing: true },
		branding: 'c15t',
	}),
}));

vi.mock('~/hooks/use-translations', () => ({
	useTranslations: () => ({
		consentTypes: defaultTranslationConfig.translations.en!.consentTypes,
		common: defaultTranslationConfig.translations.en!.common,
		legalLinks: defaultTranslationConfig.translations.en!.legalLinks,
	}),
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
		testId: 'consent-manager-widget-root',
		themeKey: 'widget',
		styles: 'custom-root',
	},
	{
		testId: 'consent-manager-widget-footer',
		themeKey: 'widgetFooter',
		styles: 'custom-footer',
	},
];

test('should apply string classNames from theme prop to widget elements', async () => {
	const theme = {
		slots: ALL_COMPONENTS.reduce((acc: any, { themeKey, styles }) => {
			acc[themeKey] = styles;
			return acc;
		}, {} as any),
	};

	await testComponentStyles({
		component: <ConsentManagerWidget />,
		theme,
		testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({ testId, styles })),
	});
});
