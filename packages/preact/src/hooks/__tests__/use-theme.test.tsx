import type { ThemeValue } from '@c15t/styles/types';
import { describe, expect, test } from 'vitest';
import { GlobalThemeContext, LocalThemeContext } from '~/context/theme-context';
import { renderHook } from '~/tests/render-hook';
import { useTheme } from '../use-theme';

/** Minimal renderHook for Preact */

type TestTheme = {
	noStyle: boolean;
	theme: {
		'dialog.root': ThemeValue;
		'dialog.title'?: ThemeValue;
		'dialog.content'?: ThemeValue;
	};
};

describe('useTheme', () => {
	test('returns global theme when no local theme is provided', () => {
		const globalTheme: TestTheme = {
			noStyle: false,
			theme: {
				'dialog.root': 'global-style',
			},
		};

		const { result } = renderHook(() => useTheme(), {
			wrapper: ({ children }) => (
				<GlobalThemeContext.Provider value={globalTheme}>
					{children}
				</GlobalThemeContext.Provider>
			),
		});

		expect(result.current).toEqual(globalTheme);
	});

	test('merges global and local themes correctly', () => {
		const globalTheme: TestTheme = {
			noStyle: false,
			theme: {
				'dialog.root': 'global-style',
				'dialog.title': 'global-title',
			},
		};

		const localTheme: Partial<TestTheme> = {
			theme: {
				'dialog.root': 'local-style',
				'dialog.content': 'local-content',
			},
		};

		const { result } = renderHook(() => useTheme(), {
			wrapper: ({ children }) => (
				<GlobalThemeContext.Provider value={globalTheme}>
					<LocalThemeContext.Provider value={localTheme}>
						{children}
					</LocalThemeContext.Provider>
				</GlobalThemeContext.Provider>
			),
		});

		expect(result.current).toEqual<TestTheme>({
			noStyle: false,
			theme: {
				'dialog.root': 'local-style',
				'dialog.title': 'global-title',
				'dialog.content': 'local-content',
			},
		});
	});

	test('local theme takes precedence over global theme', () => {
		const globalTheme: TestTheme = {
			noStyle: false,
			theme: {
				'dialog.root': 'global-style',
			},
		};

		const localTheme: TestTheme = {
			noStyle: true,
			theme: {
				'dialog.root': 'local-style',
			},
		};

		const { result } = renderHook(() => useTheme(), {
			wrapper: ({ children }) => (
				<GlobalThemeContext.Provider value={globalTheme}>
					<LocalThemeContext.Provider value={localTheme}>
						{children}
					</LocalThemeContext.Provider>
				</GlobalThemeContext.Provider>
			),
		});

		const theme = result.current as TestTheme;
		expect(theme.theme['dialog.root']).toBe('local-style');
		expect(theme.noStyle).toBe(true);
	});
});
