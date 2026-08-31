import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import {
	StableGlobalThemeProvider,
	StableLocalThemeProvider,
} from '~/v3/__tests__/stable-context-providers';
import {
	GlobalThemeContext,
	LocalThemeContext,
} from '~/v3/context/theme-context';
import type { ThemeContextValue } from '~/v3/context/theme-context';

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
				<StableGlobalThemeProvider value={globalTheme}>
					{children}
				</StableGlobalThemeProvider>
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
				<StableGlobalThemeProvider value={globalTheme}>
					<StableLocalThemeProvider value={localTheme}>
						{children}
					</StableLocalThemeProvider>
				</StableGlobalThemeProvider>
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
				<StableGlobalThemeProvider value={globalTheme}>
					<StableLocalThemeProvider value={localTheme}>
						{children}
					</StableLocalThemeProvider>
				</StableGlobalThemeProvider>
			),
		});

		expect(result.current.theme?.colors?.primary).toBe('#ffffff');
		expect(result.current.noStyle).toBe(true);
	});
});
