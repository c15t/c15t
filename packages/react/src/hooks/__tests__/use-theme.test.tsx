import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import {
	GlobalThemeContext,
	LocalThemeContext,
	type ThemeContextValue,
} from '~/context/theme-context';
import { useTheme } from '../use-theme';

describe('useTheme', () => {
	test('returns global theme when no local theme is provided', async () => {
		const globalTheme: ThemeContextValue = {
			noStyle: false,
			theme: {
				slots: {
					dialog: 'global-style',
				},
			},
		};

		const { result } = await renderHook(() => useTheme(), {
			wrapper: ({ children }) => (
				<GlobalThemeContext.Provider value={globalTheme}>
					{children}
				</GlobalThemeContext.Provider>
			),
		});

		expect(result.current).toEqual(globalTheme);
	});

	test('merges global and local themes correctly', async () => {
		const globalTheme: ThemeContextValue = {
			noStyle: false,
			theme: {
				slots: {
					dialog: 'global-style',
					dialogTitle: 'global-title',
				},
			},
		};

		const localTheme: ThemeContextValue = {
			theme: {
				slots: {
					dialog: 'local-style',
					dialogContent: 'local-content',
				},
			},
		};

		const { result } = await renderHook(() => useTheme(), {
			wrapper: ({ children }) => (
				<GlobalThemeContext.Provider value={globalTheme}>
					<LocalThemeContext.Provider value={localTheme}>
						{children}
					</LocalThemeContext.Provider>
				</GlobalThemeContext.Provider>
			),
		});

		expect(result.current).toEqual({
			noStyle: false,
			theme: {
				slots: {
					dialog: 'local-style',
					dialogTitle: 'global-title',
					dialogContent: 'local-content',
				},
			},
		});
	});

	test('local theme takes precedence over global theme', async () => {
		const globalTheme: ThemeContextValue = {
			noStyle: false,
			theme: {
				slots: {
					dialog: 'global-style',
				},
			},
		};

		const localTheme: ThemeContextValue = {
			noStyle: true,
			theme: {
				slots: {
					dialog: 'local-style',
				},
			},
		};

		const { result } = await renderHook(() => useTheme(), {
			wrapper: ({ children }) => (
				<GlobalThemeContext.Provider value={globalTheme}>
					<LocalThemeContext.Provider value={localTheme}>
						{children}
					</LocalThemeContext.Provider>
				</GlobalThemeContext.Provider>
			),
		});

		expect(result.current.theme?.slots?.dialog).toBe('local-style');
		expect(result.current.noStyle).toBe(true);
	});
});
