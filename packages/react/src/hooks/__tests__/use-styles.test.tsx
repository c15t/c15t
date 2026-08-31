import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { StableGlobalThemeProvider } from '~/__tests__/stable-context-providers';
import type { ThemeContextValue } from '~/context/theme-context';

import { useStyles } from '../use-styles';

describe('useStyles', () => {
	const mockTheme = {
		noStyle: false,
		theme: {
			slots: {
				dialogCard: {
					className: 'theme-class',
					style: { color: 'blue' },
				},
			},
		},
	} satisfies ThemeContextValue;

	test('returns component styles when no theme is provided', async () => {
		const componentStyle = {
			className: 'component-class',
			style: { backgroundColor: 'red' },
		};

		const { result } = await renderHook(
			() => useStyles('dialogCard', componentStyle),
			{
				wrapper: ({ children }) => (
					<StableGlobalThemeProvider
						value={{ noStyle: false, theme: { slots: {} } }}
					>
						{children}
					</StableGlobalThemeProvider>
				),
			}
		);

		expect(result.current.className).toContain('component-class');
		expect(result.current.style).toEqual({ backgroundColor: 'red' });
	});

	test('merges theme and component styles correctly', async () => {
		const componentStyle = {
			className: 'component-class',
			style: { backgroundColor: 'red' },
		};

		const { result } = await renderHook(
			() => useStyles('dialogCard', componentStyle),
			{
				wrapper: ({ children }) => (
					<StableGlobalThemeProvider value={mockTheme}>
						{children}
					</StableGlobalThemeProvider>
				),
			}
		);

		expect(result.current.className).toContain('theme-class');
		expect(result.current.className).toContain('component-class');
		expect(result.current.style).toEqual({
			backgroundColor: 'red',
			color: 'blue',
		});
	});

	test('handles string className correctly', async () => {
		const componentStyle = 'component-class';

		const { result } = await renderHook(
			() => useStyles('dialogCard', componentStyle),
			{
				wrapper: ({ children }) => (
					<StableGlobalThemeProvider value={mockTheme}>
						{children}
					</StableGlobalThemeProvider>
				),
			}
		);

		expect(result.current.className).toContain('theme-class');
		expect(result.current.className).toContain('component-class');
	});

	test('should remove base/default styles but keep component classNames when noStyle: true', async () => {
		const mockNoStyleTheme = {
			theme: {
				slots: {
					dialogCard: {
						className: 'theme-class',
						noStyle: true,
						style: { color: 'blue' },
					},
				},
			},
		} satisfies ThemeContextValue;

		// When noStyle is true, base/default styles are removed but
		// explicitly-set classNames are preserved
		const componentStyle = {
			baseClassName: 'base-class-to-remove',
			className: 'component-class',
			noStyle: true,
			style: { backgroundColor: 'red' },
		};

		const { result } = await renderHook(
			() => useStyles('dialogCard', componentStyle),
			{
				wrapper: ({ children }) => (
					<StableGlobalThemeProvider value={mockNoStyleTheme}>
						{children}
					</StableGlobalThemeProvider>
				),
			}
		);

		// Component classes should be kept
		expect(result.current.className).toContain('component-class');
		// noStyle flag should be set
		expect(result.current.noStyle).toBe(true);
		// Component style is used when noStyle is active
		expect(result.current.style).toEqual({ backgroundColor: 'red' });
	});
});
