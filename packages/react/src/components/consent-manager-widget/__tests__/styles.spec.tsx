import styles from '@c15t/styles/components/consent-manager-widget/css';
import { defaultTranslationConfig } from 'c15t';
import { expect, test, vi } from 'vitest';
import { ConsentManagerWidget } from '~/components/consent-manager-widget/consent-manager-widget';
import type { ThemeValue } from '~/types/theme';
import testComponentStyles from '~/utils/test-helpers';

import type { ConsentManagerWidgetTheme } from '../theme';

vi.mock('~/hooks/use-consent-manager', () => ({
	useConsentManager: vi.fn().mockReturnValue({
		getConsentCategory: vi.fn().mockReturnValue({ isEnabled: true }), // Mock needed functions
		updateConsentCategory: vi.fn(),
		saveConsents: vi.fn(),
		getDisplayedConsents: vi.fn().mockReturnValue([]), // Add missing function
		translationConfig: {
			defaultLanguage: 'en',
		},
	}),
}));

vi.mock('~/hooks/use-translations', () => ({
	useTranslations: vi
		.fn()
		.mockReturnValue(defaultTranslationConfig.translations.en),
}));

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

test('should apply string classNames from theme prop to all widget elements', async () => {
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

test('should apply className and style objects from theme prop to all widget elements', async () => {
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

test('should remove default styles but keep custom classNames when top-level noStyle prop is true', async () => {
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

test('should remove default styles but keep custom classNames when theme object provides noStyle: true', async () => {
	const testCases = ALL_COMPONENTS.reduce(
		(acc, { themeKey, styles }) => {
			acc[themeKey] = { className: styles, noStyle: true };
			return acc;
		},
		{} as Record<string, ThemeValue>
	);

	const test = <ConsentManagerWidget theme={testCases} />;

	await testComponentStyles({
		component: test,
		testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({
			testId,
			styles: { className: styles },
		})),
	});
});

test('should correctly apply styles when theme prop uses mixed string and object formats', async () => {
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

test('should handle empty strings and empty style objects in theme prop gracefully', async () => {
	const edgeCaseTheme: ConsentManagerWidgetTheme = {
		'widget.root': '',
		'widget.accordion': '',
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
				testId: 'consent-manager-widget-accordion',
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

test('Custom classes override base layer styles', async () => {
	const styleElement = document.createElement('style');
	styleElement.textContent = `
		.custom-widget-background {
			background-color: rgb(255, 0, 0) !important;
		}
		.custom-widget-foooter {
			color: rgb(0, 255, 0) !important;
		}
	`;
	document.head.appendChild(styleElement);

	const customTheme: ConsentManagerWidgetTheme = {
		'widget.root': 'custom-widget-background',
		'widget.footer': 'custom-widget-foooter',
	};

	const test = <ConsentManagerWidget theme={customTheme} />;

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'consent-manager-widget-root',
				styles: 'custom-widget-background',
			},
			{
				testId: 'consent-manager-widget-footer',
				styles: 'custom-widget-foooter',
			},
		],
	});

	const root = document.querySelector(
		'[data-testid="consent-manager-widget-root"]'
	);
	const footer = document.querySelector(
		'[data-testid="consent-manager-widget-footer"]'
	);

	if (!root || !footer) {
		throw new Error('Required elements not found in the document');
	}

	expect(getComputedStyle(root).backgroundColor).toBe('rgb(255, 0, 0)');
	expect(getComputedStyle(footer).color).toBe('rgb(0, 255, 0)');

	document.head.removeChild(styleElement);
});

test('Base layer styles are applied when no custom classes are provided', async () => {
	await testComponentStyles({
		component: <ConsentManagerWidget />,
		testCases: [],
	});

	const root = document.querySelector(
		'[data-testid="consent-manager-widget-root"]'
	);
	const footer = document.querySelector(
		'[data-testid="consent-manager-widget-footer"]'
	);
	// console.log(root, trigger);
	if (!root || !footer) {
		throw new Error('Required elements not found in the document');
	}

	expect(getComputedStyle(root).backgroundColor).toBe('rgba(0, 0, 0, 0)');
	expect(getComputedStyle(footer).color).toBe('rgb(0, 0, 0)');
});

test('Multiple custom classes can be applied and override base layer', async () => {
	const styleElement = document.createElement('style');
	styleElement.textContent = `
		.custom-padding {
			padding: 32px !important;
		}
		.custom-border {
			border: 2px solid rgb(0, 0, 255) !important;
		}
	`;
	document.head.appendChild(styleElement);

	const customTheme: ConsentManagerWidgetTheme = {
		'widget.root': 'custom-padding custom-border',
	};

	const test = <ConsentManagerWidget theme={customTheme} />;

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'consent-manager-widget-root',
				styles: 'custom-padding custom-border',
			},
		],
	});

	const root = document.querySelector(
		'[data-testid="consent-manager-widget-root"]'
	);

	if (!root) {
		throw new Error('Required elements not found in the document');
	}

	expect(getComputedStyle(root).padding).toBe('32px');
	expect(getComputedStyle(root).border).toBe('2px solid rgb(0, 0, 255)');

	document.head.removeChild(styleElement);
});

test('All consent manager widget components should have their base classes applied', async () => {
	const test = <ConsentManagerWidget />;

	const baseClasses = {
		card: styles.card || '',
		header: styles.header || '',
		title: styles.title || '',
		description: styles.description || '',
		content: styles.content || '',
		footer: styles.footer || '',
		footerGroup: styles.footerGroup || '',
		accordionItem: styles.accordionItem || '',
		accordionTrigger: styles.accordionTrigger || '',
		accordionTriggerInner: styles.accordionTriggerInner || '',
		accordionContent: styles.accordionContent || '',
		accordionArrow: styles.accordionArrow || '',
		switch: styles.switch || '',
	};

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'consent-manager-widget-footer',
				styles: baseClasses.footer,
			},
			{
				testId: 'consent-manager-widget-footer-sub-group',
				styles: baseClasses.footerGroup,
			},
			{
				testId: 'consent-manager-widget-accordion-trigger-marketing',
				styles: baseClasses.accordionTrigger,
			},
			{
				testId: 'consent-manager-widget-accordion-trigger-inner-marketing',
				styles: baseClasses.accordionTriggerInner,
			},
			{
				testId: 'consent-manager-widget-accordion-content-marketing',
				styles: baseClasses.accordionContent,
			},
			{
				testId: 'consent-manager-widget-switch-marketing',
				styles: baseClasses.switch,
			},
		],
	});

	// Also verify that none of the base classes are empty strings
	for (const [key, value] of Object.entries(baseClasses)) {
		expect(value, `Base class for ${key} should not be empty`).not.toBe('');
	}
});
