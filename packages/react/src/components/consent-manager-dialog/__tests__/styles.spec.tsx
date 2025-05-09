import { defaultTranslationConfig } from 'c15t';
import { expect, test, vi } from 'vitest';
import { ConsentManagerDialog } from '~/components/consent-manager-dialog/consent-manager-dialog';
import type { ThemeValue } from '~/types/theme';
import testComponentStyles from '~/utils/test-helpers';
import styles from '../consent-manager-dialog.module.css';
import type { ConsentManagerDialogTheme } from '../theme';
type ComponentTestCase = {
	testId: string;
	themeKey: keyof ConsentManagerDialogTheme;
	styles: string;
};

const ALL_COMPONENTS: ComponentTestCase[] = [
	{
		testId: 'consent-manager-dialog-root',
		themeKey: 'dialog.root',
		styles: 'custom-dialog-root',
	},
	{
		testId: 'consent-manager-dialog-overlay',
		themeKey: 'dialog.overlay',
		styles: 'custom-dialog-overlay',
	},
	{
		testId: 'consent-manager-dialog-header',
		themeKey: 'dialog.header',
		styles: 'custom-dialog-header',
	},
	{
		testId: 'consent-manager-dialog-title',
		themeKey: 'dialog.title',
		styles: 'custom-dialog-title',
	},
	{
		testId: 'consent-manager-dialog-description',
		themeKey: 'dialog.description',
		styles: 'custom-dialog-description',
	},
	{
		testId: 'consent-manager-dialog-content',
		themeKey: 'dialog.content',
		styles: 'custom-dialog-content',
	},
	{
		testId: 'consent-manager-dialog-footer',
		themeKey: 'dialog.footer',
		styles: 'custom-dialog-footer',
	},
];

vi.mock('~/hooks/use-consent-manager', () => ({
	useConsentManager: () => ({
		isPrivacyDialogOpen: true, // Set relevant state for dialog tests
		getDisplayedConsents: vi.fn(() => []), // Add missing function
		saveConsents: vi.fn(),
		setShowPopup: vi.fn(),
		setIsPrivacyDialogOpen: vi.fn(),
	}),
}));

vi.mock('~/hooks/use-translations', () => ({
	useTranslations: () => defaultTranslationConfig.translations.en,
}));

test('should apply string classNames from theme prop to all dialog elements', async () => {
	const test = (
		<ConsentManagerDialog
			open
			scrollLock
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

test('should apply className and style objects from theme prop to all dialog elements', async () => {
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
		<ConsentManagerDialog
			open
			scrollLock
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
		<ConsentManagerDialog
			scrollLock
			noStyle
			open
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

	const test = <ConsentManagerDialog scrollLock open theme={testCases} />;

	await testComponentStyles({
		component: test,
		testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({
			testId,
			styles: { className: styles },
		})),
	});
});

test('should correctly apply styles when theme prop uses mixed string and object formats', async () => {
	const mixedTheme: ConsentManagerDialogTheme = {
		'dialog.root': {
			className: 'custom-dialog-root',
			style: {
				backgroundColor: 'rgb(255, 255, 255)',
				padding: '16px',
			},
		},
		'dialog.overlay': 'custom-dialog-overlay',
	};

	const test = <ConsentManagerDialog scrollLock theme={mixedTheme} open />;

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'consent-manager-dialog-root',
				styles: {
					className: 'custom-dialog-root',
					style: {
						backgroundColor: 'rgb(255, 255, 255)',
						padding: '16px',
					},
				},
			},
			{
				testId: 'consent-manager-dialog-overlay',
				styles: 'custom-dialog-overlay',
			},
		],
	});
});

test('should handle empty strings and empty style objects in theme prop gracefully', async () => {
	const edgeCaseTheme: ConsentManagerDialogTheme = {
		'dialog.root': '',
		'dialog.overlay': '',
		'dialog.content': {
			className: '',
			style: {
				margin: '0',
				padding: '0',
			},
		},
	};

	const test = <ConsentManagerDialog scrollLock open theme={edgeCaseTheme} />;

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'consent-manager-dialog-root',
				styles: '',
			},
			{
				testId: 'consent-manager-dialog-overlay',
				styles: '',
			},
			{
				testId: 'consent-manager-dialog-content',
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

test('should override base layer styles', async () => {
	const styleElement = document.createElement('style');
	styleElement.textContent = `
		.custom-dialog-background {
			background-color: rgb(255, 0, 0) !important;
		}
		.custom-dialog-text {
			color: rgb(0, 255, 0) !important;
		}
	`;
	document.head.appendChild(styleElement);

	const customTheme: ConsentManagerDialogTheme = {
		'dialog.root': 'custom-dialog-background',
		'dialog.title': 'custom-dialog-text',
	};

	const test = <ConsentManagerDialog theme={customTheme} />;

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'consent-manager-dialog-root',
				styles: 'custom-dialog-background',
			},
			{
				testId: 'consent-manager-dialog-title',
				styles: 'custom-dialog-text',
			},
		],
	});

	const root = document.querySelector(
		'[data-testid="consent-manager-dialog-root"]'
	);
	const title = document.querySelector(
		'[data-testid="consent-manager-dialog-title"]'
	);

	if (!root || !title) {
		throw new Error('Required elements not found in the document');
	}

	expect(getComputedStyle(root).backgroundColor).toBe('rgb(255, 0, 0)');
	expect(getComputedStyle(title).color).toBe('rgb(0, 255, 0)');

	document.head.removeChild(styleElement);
});

test('Base layer styles are applied when no custom classes are provided', async () => {
	const test = <ConsentManagerDialog />;

	await testComponentStyles({
		component: test,
		testCases: [],
	});

	const root = document.querySelector(
		'[data-testid="consent-manager-dialog-root"]'
	);
	const title = document.querySelector(
		'[data-testid="consent-manager-dialog-title"]'
	);

	if (!root || !title) {
		throw new Error('Required elements not found in the document');
	}

	expect(getComputedStyle(root).backgroundColor).toBe('rgb(255, 255, 255)');
	expect(getComputedStyle(title).color).toBe('rgb(23, 23, 23)');
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

	const customTheme: ConsentManagerDialogTheme = {
		'dialog.root': 'custom-padding custom-border',
	};

	const test = <ConsentManagerDialog theme={customTheme} />;

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'consent-manager-dialog-root',
				styles: 'custom-padding custom-border',
			},
		],
	});

	const root = document.querySelector(
		'[data-testid="consent-manager-dialog-root"]'
	);

	if (!root) {
		throw new Error('Required elements not found in the document');
	}

	expect(getComputedStyle(root).padding).toBe('32px');
	expect(getComputedStyle(root).border).toBe('2px solid rgb(0, 0, 255)');

	document.head.removeChild(styleElement);
});

test('All consent manager dialog components should have their base classes applied', async () => {
	const test = <ConsentManagerDialog open />;

	const baseClasses = {
		root: styles.root || '',
		card: styles.card || '',
		header: styles.header || '',
		title: styles.title || '',
		description: styles.description || '',
		content: styles.content || '',
		footer: styles.footer || '',
		overlay: styles.overlay || '',
	};

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'consent-manager-dialog-root',
				styles: `${styles.card} ${styles.card} ${styles.card}`,
			},
			{
				testId: 'consent-manager-dialog-card',
				styles: baseClasses.card,
			},
			{
				testId: 'consent-manager-dialog-header',
				styles: baseClasses.header,
			},
			{
				testId: 'consent-manager-dialog-title',
				styles: baseClasses.title,
			},
			{
				testId: 'consent-manager-dialog-description',
				styles: baseClasses.description,
			},
			{
				testId: 'consent-manager-dialog-content',
				styles: baseClasses.content,
			},
			{
				testId: 'consent-manager-dialog-footer',
				styles: baseClasses.footer,
			},
			{
				testId: 'consent-manager-dialog-overlay',
				styles: baseClasses.overlay,
			},
		],
	});

	// Also verify that none of the base classes are empty strings
	for (const [key, value] of Object.entries(baseClasses)) {
		expect(value, `Base class for ${key} should not be empty`).not.toBe('');
	}
});
