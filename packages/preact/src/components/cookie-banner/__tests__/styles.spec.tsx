import { defaultTranslationConfig } from 'c15t';
import { expect, test } from 'vitest';
import { vi } from 'vitest';
import { CookieBanner } from '~/components/cookie-banner/cookie-banner';
import type { ThemeValue } from '~/types/theme';
import {
	assertElementStyles,
	renderComponentStyles,
} from '~/utils/test-helpers';
import buttonStyles from '../../shared/ui/button/button.module.css';
import styles from '../cookie-banner.module.css';
import type { CookieBannerTheme } from '../theme';

vi.mock('~/hooks/use-consent-manager', async (importOriginal) => {
	const realModule =
		await importOriginal<typeof import('~/hooks/use-consent-manager')>();
	return {
		useConsentManager: () => ({
			...realModule.useConsentManager(),
			showPopup: true,
			isPrivacyDialogOpen: false,
		}),
	};
});

vi.mock('~/hooks/use-translations', () => ({
	useTranslations: () => defaultTranslationConfig.translations.en,
}));

type ComponentTestCase = {
	testId: string;
	themeKey: string;
	styles: string;
};

const ALL_COMPONENTS: ComponentTestCase[] = [
	{
		testId: 'cookie-banner-root',
		themeKey: 'banner.root',
		styles: 'custom-root',
	},
	{
		testId: 'cookie-banner-card',
		themeKey: 'banner.card',
		styles: 'custom-card',
	},
	{
		testId: 'cookie-banner-header',
		themeKey: 'banner.header.root',
		styles: 'custom-header',
	},
	{
		testId: 'cookie-banner-title',
		themeKey: 'banner.header.title',
		styles: 'custom-title',
	},
	{
		testId: 'cookie-banner-description',
		themeKey: 'banner.header.description',
		styles: 'custom-description',
	},
	{
		testId: 'cookie-banner-footer',
		themeKey: 'banner.footer',
		styles: 'custom-footer',
	},
	{
		testId: 'cookie-banner-footer-sub-group',
		themeKey: 'banner.footer.sub-group',
		styles: 'custom-footer-sub-group',
	},
	{
		testId: 'cookie-banner-overlay',
		themeKey: 'banner.overlay',
		styles: 'custom-overlay',
	},
	{
		testId: 'cookie-banner-reject-button',
		themeKey: 'banner.footer.reject-button',
		styles: 'custom-reject-button',
	},
	{
		testId: 'cookie-banner-customize-button',
		themeKey: 'banner.footer.customize-button',
		styles: 'custom-customize-button',
	},
	{
		testId: 'cookie-banner-accept-button',
		themeKey: 'banner.footer.accept-button',
		styles: 'custom-accept-button',
	},
];

test('should apply string classNames from theme prop to all banner elements', async () => {
	const test = (
		<CookieBanner
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

	const results = await renderComponentStyles({
		component: test,
		testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({
			testId,
			styles,
		})),
	});

	for (const { testId, element } of results) {
		const testCase = ALL_COMPONENTS.find((tc) => tc.testId === testId);
		if (testCase) {
			assertElementStyles(element, testCase.styles, testId, false);
		}
	}
});

test('should apply className and style objects from theme prop to all banner elements', async () => {
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
		<CookieBanner
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

	const results = await renderComponentStyles({
		component: test,
		testCases: testCases.map(({ testId, className, style }) => ({
			testId,
			styles: {
				className,
				style,
			},
		})),
	});

	for (const { testId, element } of results) {
		const testCase = testCases.find((tc) => tc.testId === testId);
		if (testCase) {
			assertElementStyles(
				element,
				{
					className: testCase.className,
					style: testCase.style as unknown as string,
				},
				testId,
				false
			);
		}
	}
});

test('should remove default styles but keep custom classNames when top-level noStyle prop is true', async () => {
	const test = (
		<CookieBanner
			scrollLock
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

	const results = await renderComponentStyles({
		component: test,
		testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({
			testId,
			styles,
		})),
	});

	for (const { testId, element } of results) {
		const testCase = ALL_COMPONENTS.find((tc) => tc.testId === testId);
		if (testCase) {
			assertElementStyles(element, testCase.styles, testId, false);
		}
	}
});

test('should remove default styles but keep custom classNames when theme object provides noStyle: true', async () => {
	const testCases = ALL_COMPONENTS.reduce(
		(acc, { themeKey, styles }) => {
			acc[themeKey] = { className: styles, noStyle: true };
			return acc;
		},
		{} as Record<string, ThemeValue>
	);

	const test = <CookieBanner scrollLock theme={testCases} />;

	const results = await renderComponentStyles({
		component: test,
		testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({
			testId,
			styles: { className: styles },
		})),
	});

	for (const { testId, element } of results) {
		const testCase = ALL_COMPONENTS.find((tc) => tc.testId === testId);
		if (testCase) {
			assertElementStyles(
				element,
				{ className: testCase.styles },
				testId,
				false
			);
		}
	}
});

test('should correctly apply styles when theme prop uses mixed string and object formats', async () => {
	const mixedTheme: CookieBannerTheme = {
		'banner.root': {
			className: 'custom-root',
			style: {
				backgroundColor: 'rgb(255, 255, 255)',
				padding: '16px',
			},
		},
		'banner.header.title': 'custom-title',
	};

	const test = <CookieBanner scrollLock theme={mixedTheme} />;

	const testCases = [
		{
			testId: 'cookie-banner-root',
			styles: {
				className: 'custom-root',
				style: {
					backgroundColor: 'rgb(255, 255, 255)',
					padding: '16px',
				},
			},
		},
		{
			testId: 'cookie-banner-title',
			styles: 'custom-title',
		},
	];

	const results = await renderComponentStyles({
		component: test,
		testCases,
	});

	for (const { testId, element } of results) {
		const testCase = testCases.find((tc) => tc.testId === testId);
		if (testCase) {
			assertElementStyles(element, testCase.styles, testId, false);
		}
	}
});

test('should handle empty strings and empty style objects in theme prop gracefully', async () => {
	const edgeCaseTheme: CookieBannerTheme = {
		'banner.root': '',
		'banner.card': '',
		'banner.header.root': '',
		'banner.header.title': '',
		'banner.header.description': '',
		'banner.footer': {
			className: '',
			style: {
				margin: '0',
				padding: '0',
			},
		},
	};

	const test = <CookieBanner scrollLock theme={edgeCaseTheme} />;

	const testCases = [
		{
			testId: 'cookie-banner-root',
			styles: '',
		},
		{
			testId: 'cookie-banner-title',
			styles: '',
		},
		{
			testId: 'cookie-banner-footer',
			styles: {
				className: '',
				style: {
					margin: '0',
					padding: '0',
				},
			},
		},
	];

	const results = await renderComponentStyles({
		component: test,
		testCases,
	});

	for (const { testId, element } of results) {
		const testCase = testCases.find((tc) => tc.testId === testId);
		if (testCase) {
			assertElementStyles(element, testCase.styles, testId, false);
		}
	}
});

test('Custom classes override base layer styles', async () => {
	const styleElement = document.createElement('style');
	styleElement.textContent = `
		.custom-banner-background {
			background-color: rgb(255, 0, 0) !important;
		}
		.custom-banner-text {
			color: rgb(0, 255, 0) !important;
		}
	`;
	document.head.appendChild(styleElement);

	const customTheme: CookieBannerTheme = {
		'banner.card': 'custom-banner-background',
		'banner.header.title': 'custom-banner-text',
	};

	const test = <CookieBanner theme={customTheme} />;

	const testCases = [
		{
			testId: 'cookie-banner-card',
			styles: 'custom-banner-background',
		},
		{
			testId: 'cookie-banner-title',
			styles: 'custom-banner-text',
		},
	];

	const results = await renderComponentStyles({
		component: test,
		testCases,
	});

	for (const { testId, element } of results) {
		const testCase = testCases.find((tc) => tc.testId === testId);
		if (testCase) {
			assertElementStyles(element, testCase.styles, testId, false);
		}
	}

	const card = document.querySelector('[data-testid="cookie-banner-card"]');
	const title = document.querySelector('[data-testid="cookie-banner-title"]');

	if (!card || !title) {
		throw new Error('Required elements not found in the document');
	}

	expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 0, 0)');
	expect(getComputedStyle(title).color).toBe('rgb(0, 255, 0)');

	document.head.removeChild(styleElement);
});

test('Base layer styles are applied when no custom classes are provided', async () => {
	const test = <CookieBanner />;

	const testCases: Array<{ testId: string; styles: string }> = [];
	const results = await renderComponentStyles({
		component: test,
		testCases,
	});

	for (const { testId, element } of results) {
		const testCase = testCases.find((tc) => tc.testId === testId);
		if (testCase) {
			assertElementStyles(element, testCase.styles, testId, false);
		}
	}

	const card = document.querySelector('[data-testid="cookie-banner-card"]');
	const title = document.querySelector('[data-testid="cookie-banner-title"]');

	if (!card || !title) {
		throw new Error('Required elements not found in the document');
	}

	expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)');
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

	const customTheme: CookieBannerTheme = {
		'banner.card': 'custom-padding custom-border',
	};

	const test = <CookieBanner theme={customTheme} />;

	const testCases = [
		{
			testId: 'cookie-banner-card',
			styles: 'custom-padding custom-border',
		},
	];

	const results = await renderComponentStyles({
		component: test,
		testCases,
	});

	for (const { testId, element } of results) {
		const testCase = testCases.find((tc) => tc.testId === testId);
		if (testCase) {
			assertElementStyles(element, testCase.styles, testId, false);
		}
	}

	const card = document.querySelector('[data-testid="cookie-banner-card"]');

	if (!card) {
		throw new Error('Required elements not found in the document');
	}

	expect(getComputedStyle(card).padding).toBe('32px');
	expect(getComputedStyle(card).border).toBe('2px solid rgb(0, 0, 255)');

	document.head.removeChild(styleElement);
});

test('All cookie banner components should have their base classes applied', async () => {
	const test = <CookieBanner />;

	const baseClasses = {
		root: styles.root || '',
		card: styles.card || '',
		header: styles.header || '',
		title: styles.title || '',
		description: styles.description || '',
		footer: styles.footer || '',
		footerSubGroup: styles.footerSubGroup || '',
		rejectButton: `${buttonStyles.button} ${buttonStyles['button-small']} ${buttonStyles['button-neutral-stroke']}`,
		acceptButton: `${buttonStyles.button} ${buttonStyles['button-small']} ${buttonStyles['button-primary-stroke']}`,
		customizeButton: `${buttonStyles.button} ${buttonStyles['button-small']} ${buttonStyles['button-neutral-stroke']}`,
	};

	const testCases = [
		{
			testId: 'cookie-banner-root',
			styles: baseClasses.root,
		},
		{
			testId: 'cookie-banner-card',
			styles: baseClasses.card,
		},
		{
			testId: 'cookie-banner-header',
			styles: baseClasses.header,
		},
		{
			testId: 'cookie-banner-title',
			styles: baseClasses.title,
		},
		{
			testId: 'cookie-banner-description',
			styles: baseClasses.description,
		},
		{
			testId: 'cookie-banner-footer',
			styles: baseClasses.footer,
		},
		{
			testId: 'cookie-banner-footer-sub-group',
			styles: baseClasses.footerSubGroup,
		},
		{
			testId: 'cookie-banner-reject-button',
			styles: baseClasses.rejectButton,
		},
		{
			testId: 'cookie-banner-customize-button',
			styles: baseClasses.customizeButton,
		},
		{
			testId: 'cookie-banner-accept-button',
			styles: baseClasses.acceptButton,
		},
	];

	const results = await renderComponentStyles({
		component: test,
		testCases,
	});

	for (const { testId, element } of results) {
		const testCase = testCases.find((tc) => tc.testId === testId);
		if (testCase) {
			assertElementStyles(element, testCase.styles, testId, false);
		}
	}

	// Also verify that none of the base classes are empty strings
	for (const [key, value] of Object.entries(baseClasses)) {
		expect(value, `Base class for ${key} should not be empty`).not.toBe('');
	}
});
