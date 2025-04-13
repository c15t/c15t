import { test, vi } from 'vitest';
import { ConsentManagerWidget } from '~/components/consent-manager-widget/consent-manager-widget';
import type { ThemeValue } from '~/types/theme';
import testComponentStyles from '~/utils/test-helpers';
import type { ConsentManagerWidgetTheme } from '../theme';

// Need to mock the exact modules that are imported
vi.mock('c15t', () => {
	return {
		configureConsentManager: () => ({
			getCallbacks: () => ({}),
			setCallbacks: () => ({}),
			showConsentBanner: async () => ({
				ok: true,
				data: { showConsentBanner: true },
				error: null,
				response: null,
			}),
			setConsent: async () => ({
				ok: true,
				data: { success: true },
				error: null,
				response: null,
			}),
			verifyConsent: async () => ({
				ok: true,
				data: { valid: true },
				error: null,
				response: null,
			}),
		}),
		// Mock the store with all required functions
		createConsentManagerStore: vi.fn().mockReturnValue({
			getState: () => ({
				setGdprTypes: vi.fn(),
				setComplianceSetting: vi.fn(),
				setDetectedCountry: vi.fn(),
				consents: {
					essential: true,
					functional: true,
					analytics: false,
					marketing: false,
				},
				setConsent: vi.fn(),
				getDisplayedConsents: () => [
					{ name: 'essential', disabled: true },
					{ name: 'functional', disabled: false },
					{ name: 'analytics', disabled: false },
					{ name: 'marketing', disabled: false },
				],
				showPopup: false,
			}),
			subscribe: () => () => {},
			setState: vi.fn(),
		}),
		defaultTranslationConfig: {},
	};
});

// Mock using the full path as Vitest expects it
vi.mock('../../../hooks/use-consent-manager', () => {
	return {
		useConsentManager: () => ({
			consents: {
				essential: true,
				functional: true,
				analytics: false,
				marketing: false,
			},
			setConsent: vi.fn(),
			getDisplayedConsents: () => [
				{ name: 'essential', disabled: true },
				{ name: 'functional', disabled: false },
				{ name: 'analytics', disabled: false },
				{ name: 'marketing', disabled: false },
			],
			showPopup: false,
			manager: {},
		}),
	};
});

// Mock the useTranslations hook with the correct path
vi.mock('../../../hooks/use-translations', () => {
	return {
		useTranslations: () => ({
			consentManagerWidget: {
				rejectAll: 'Reject All',
				acceptAll: 'Accept All',
				save: 'Save',
			},
			consentTypes: {
				essential: {
					title: 'Essential',
					description:
						'Essential cookies are required for the website to function properly.',
				},
				functional: {
					title: 'Functional',
					description:
						'Functional cookies help perform certain functionalities.',
				},
				analytics: {
					title: 'Analytics',
					description:
						'Analytics cookies help us understand how visitors interact with the website.',
				},
				marketing: {
					title: 'Marketing',
					description: 'Marketing cookies help track visitors across websites.',
				},
			},
		}),
	};
});

type ComponentTestCase = {
	testId: string;
	themeKey: string;
	styles: string;
};

const ALL_COMPONENTS: ComponentTestCase[] = [
	{
		testId: 'consent-manager-widget-root',
		themeKey: 'widget.root',
		styles: 'custom-root',
	},
	{
		testId: 'consent-manager-widget-footer',
		themeKey: 'widget.footer',
		styles: 'custom-footer',
	},
	{
		testId: 'consent-manager-widget-footer-sub-group',
		themeKey: 'widget.footer.sub-group',
		styles: 'custom-footer-sub-group',
	},
	{
		testId: 'consent-manager-widget-reject-button',
		themeKey: 'widget.footer.reject-button',
		styles: 'custom-reject-button',
	},
	{
		testId: 'consent-manager-widget-footer-accept-button',
		themeKey: 'widget.footer.accept-button',
		styles: 'custom-accept-button',
	},
	{
		testId: 'consent-manager-widget-footer-save-button',
		themeKey: 'widget.footer.save-button',
		styles: 'custom-save-button',
	},
	{
		testId: 'consent-manager-widget-accordion-trigger-marketing',
		themeKey: 'widget.accordion.trigger',
		styles: 'custom-accordion-trigger',
	},
	{
		testId: 'consent-manager-widget-accordion-trigger-inner-marketing',
		themeKey: 'widget.accordion.trigger-inner',
		styles: 'custom-accordion-trigger-inner',
	},
	{
		testId: 'consent-manager-widget-accordion-content-marketing',
		themeKey: 'widget.accordion.content',
		styles: 'custom-accordion-content',
	},
	{
		testId: 'consent-manager-widget-switch-marketing',
		themeKey: 'widget.switch',
		styles: 'custom-switch',
	},
];

test('Theme prop applies string classnames to all components', async () => {
	const test = (
		<ConsentManagerWidget
			theme={ALL_COMPONENTS.reduce(
				(acc, { themeKey, styles }) => {
					acc[themeKey] = styles;
					return acc;
				},
				{} as Record<string, ThemeValue>
			)}
		/>
	);

	await testComponentStyles({
		component: test,
		testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({
			testId,
			styles,
		})),
	});
});

test('Theme prop supports object format with className and style for all components', async () => {
	const style = {
		backgroundColor: '#ffffff',
		padding: '20px',
		border: '1px solid #000000',
	} as const;

	const testCases = ALL_COMPONENTS.map(({ testId, themeKey, styles }) => ({
		testId,
		themeKey,
		className: styles,
		style,
	}));

	const test = (
		<ConsentManagerWidget
			theme={testCases.reduce(
				(acc, { themeKey, className, style }) => {
					acc[themeKey] = {
						className,
						style,
					};
					return acc;
				},
				{} as Record<string, ThemeValue>
			)}
		/>
	);

	await testComponentStyles({
		component: test,
		testCases: testCases.map(({ testId, className, style }) => ({
			testId,
			styles: {
				className,
				style,
			},
		})),
	});
});

test('No style prop removes default styles but keeps custom classNames', async () => {
	const test = (
		<ConsentManagerWidget
			noStyle
			theme={ALL_COMPONENTS.reduce(
				(acc, { themeKey, styles }) => {
					acc[themeKey] = styles;
					return acc;
				},
				{} as Record<string, ThemeValue>
			)}
		/>
	);

	await testComponentStyles({
		component: test,
		testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({
			testId,
			styles,
		})),
		noStyle: true,
	});
});

test('Theme prop handles mixed format (string and object) correctly', async () => {
	const mixedTheme: ConsentManagerWidgetTheme = {
		'widget.root': {
			className: 'custom-root',
			style: {
				backgroundColor: 'rgb(255, 255, 255)',
				padding: '16px',
			},
		},
		'widget.accordion.trigger': 'custom-accordion-trigger',
	};

	const test = <ConsentManagerWidget theme={mixedTheme} />;

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'consent-manager-widget-root',
				styles: {
					className: 'custom-root',
					style: {
						backgroundColor: 'rgb(255, 255, 255)',
						padding: '16px',
					},
				},
			},
			{
				testId: 'consent-manager-widget-accordion-trigger-marketing',
				styles: 'custom-accordion-trigger',
			},
		],
	});
});

test('Theme prop handles edge cases gracefully', async () => {
	const edgeCaseTheme: ConsentManagerWidgetTheme = {
		'widget.root': '',
		'widget.footer': {
			className: '',
			style: {
				margin: '0',
				padding: '0',
			},
		},
	};

	const test = <ConsentManagerWidget theme={edgeCaseTheme} />;

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'consent-manager-widget-root',
				styles: '',
			},
			{
				testId: 'consent-manager-widget-footer',
				styles: {
					className: '',
					style: {
						margin: '0',
						padding: '0',
					},
				},
			},
		],
	});
});
