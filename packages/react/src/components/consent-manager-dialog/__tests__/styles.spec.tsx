import { defaultTranslationConfig } from 'c15t';
import { test, vi } from 'vitest';
import { ConsentManagerDialog } from '~/components/consent-manager-dialog/consent-manager-dialog';
import testComponentStyles from '~/utils/test-helpers';

vi.mock('~/hooks/use-consent-manager', () => ({
	useConsentManager: () => ({
		isPrivacyDialogOpen: true,
		translationConfig: {
			defaultLanguage: 'en',
		},
		saveConsents: vi.fn(),
		setShowPopup: vi.fn(),
		setIsPrivacyDialogOpen: vi.fn(),
		setConsent: vi.fn(),
		getDisplayedConsents: () => [],
		selectedConsents: {},
		branding: 'c15t',
	}),
}));

vi.mock('~/hooks/use-translations', () => ({
	useTranslations: () => ({
		consentManagerDialog:
			defaultTranslationConfig.translations.en!.consentManagerDialog,
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
		testId: 'consent-manager-dialog-root',
		themeKey: 'dialog',
		styles: 'custom-root',
	},
	{
		testId: 'consent-manager-dialog-card',
		themeKey: 'dialogCard',
		styles: 'custom-card',
	},
	{
		testId: 'consent-manager-dialog-header',
		themeKey: 'dialogHeader',
		styles: 'custom-header',
	},
	{
		testId: 'consent-manager-dialog-title',
		themeKey: 'dialogTitle',
		styles: 'custom-title',
	},
	{
		testId: 'consent-manager-dialog-description',
		themeKey: 'dialogDescription',
		styles: 'custom-description',
	},
	{
		testId: 'consent-manager-dialog-content',
		themeKey: 'dialogContent',
		styles: 'custom-content',
	},
	{
		testId: 'consent-manager-dialog-footer',
		themeKey: 'dialogFooter',
		styles: 'custom-footer',
	},
	{
		testId: 'consent-manager-dialog-overlay',
		themeKey: 'dialogOverlay',
		styles: 'custom-overlay',
	},
];

test('should apply string classNames from theme prop to all dialog elements', async () => {
	const theme = {
		slots: ALL_COMPONENTS.reduce((acc: any, { themeKey, styles }) => {
			acc[themeKey] = styles;
			return acc;
		}, {} as any),
	};

	await testComponentStyles({
		component: <ConsentManagerDialog />,
		theme,
		testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({ testId, styles })),
	});
});
