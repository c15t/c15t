import { test } from 'vitest';
import { ConsentManagerDialog } from '~/components/consent-manager-dialog/consent-manager-dialog';
import type { ThemeValue } from '~/types/theme';
import type { ConsentManagerDialogTheme } from '../theme';
import testComponentStyles from './utils';

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

test('Theme prop applies string classnames to all components', async () => {
	const test = (
		<ConsentManagerDialog
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
		<ConsentManagerDialog
			open
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
		<ConsentManagerDialog
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

test('Theme prop handles mixed format (string and object) correctly', async () => {
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

	const test = <ConsentManagerDialog theme={mixedTheme} open />;

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

test('Theme prop handles edge cases gracefully', async () => {
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

	const test = <ConsentManagerDialog open theme={edgeCaseTheme} />;

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
