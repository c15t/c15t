import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import {
	StableGlobalThemeProvider,
	StableLocalThemeProvider,
} from '~/__tests__/stable-context-providers';
import type { ThemeContextValue } from '~/context/theme-context';

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
				slots: {
					dialog: 'local-style',
					dialogContent: 'local-content',
					dialogTitle: 'global-title',
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
				<StableGlobalThemeProvider value={globalTheme}>
					<StableLocalThemeProvider value={localTheme}>
						{children}
					</StableLocalThemeProvider>
				</StableGlobalThemeProvider>
			),
		});

		expect(result.current.theme?.slots?.dialog).toBe('local-style');
		expect(result.current.noStyle).toBe(true);
	});
});
