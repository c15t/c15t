import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import {
	GlobalThemeContext,
	LocalThemeContext,
	type ThemeContextValue,
} from '~/v3/context/theme-context';

import { useTheme } from '../use-theme';

describe('useTheme', () => {
	test('returns global theme when no local theme is provided', async () => {
		const globalTheme: ThemeContextValue = {
			noStyle: false,
			theme: {
				colors: {
					primary: '#000000',
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
				colors: {
					primary: '#000000',
					secondary: '#111111',
				},
			},
		};

		const localTheme: ThemeContextValue = {
			theme: {
				colors: {
					primary: '#ffffff',
					border: '#eeeeee',
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
				colors: {
					primary: '#ffffff',
					secondary: '#111111',
					border: '#eeeeee',
				},
			},
		});
	});

	test('local theme takes precedence over global theme', async () => {
		const globalTheme: ThemeContextValue = {
			noStyle: false,
			theme: {
				colors: {
					primary: '#000000',
				},
			},
		};

		const localTheme: ThemeContextValue = {
			noStyle: true,
			theme: {
				colors: {
					primary: '#ffffff',
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

		expect(result.current.theme?.colors?.primary).toBe('#ffffff');
		expect(result.current.noStyle).toBe(true);
	});
});
