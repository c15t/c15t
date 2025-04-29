import { expect, test } from 'vitest';
import { vi } from 'vitest';
import { CookieBanner } from '~/components/cookie-banner/cookie-banner';
import type { ThemeValue } from '~/types/theme';
import testComponentStyles from '~/utils/test-helpers';
import type { CookieBannerTheme } from '../theme';

vi.mock('~/hooks/use-consent-manager', () => ({
	useConsentManager: () => ({
		showPopup: true,
		...vi.fn(),
	}),
}));

// Mock the useTranslations hook
vi.mock('~/hooks/use-translations', () => ({
	useTranslations: () => ({
		cookieBanner: {
			title: 'Cookie Settings',
			description: 'We use cookies to enhance your experience',
			acceptAll: 'Accept All',
			rejectAll: 'Reject All',
			customize: 'Customize',
		},
	}),
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

test('Theme prop applies string classnames to all components', async () => {
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

	await testComponentStyles({
		component: test,
		testCases: [
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
		],
	});
});

test('Theme prop handles edge cases gracefully', async () => {
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

	await testComponentStyles({
		component: test,
		testCases: [
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
		],
	});
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

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'cookie-banner-card',
				styles: 'custom-banner-background',
			},
			{
				testId: 'cookie-banner-title',
				styles: 'custom-banner-text',
			},
		],
	});

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

	await testComponentStyles({
		component: test,
		testCases: [],
	});

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

	await testComponentStyles({
		component: test,
		testCases: [
			{
				testId: 'cookie-banner-card',
				styles: 'custom-padding custom-border',
			},
		],
	});

	const card = document.querySelector('[data-testid="cookie-banner-card"]');

	if (!card) {
		throw new Error('Required elements not found in the document');
	}

	expect(getComputedStyle(card).padding).toBe('32px');
	expect(getComputedStyle(card).border).toBe('2px solid rgb(0, 0, 255)');

	document.head.removeChild(styleElement);
});
