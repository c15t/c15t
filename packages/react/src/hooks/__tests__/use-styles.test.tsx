import { renderHook } from 'vitest-browser-react';
import { describe, expect, test } from 'vitest';
import { GlobalThemeContext } from '~/context/theme-context';
import { useStyles } from '../use-styles';

describe('useStyles', () => {
	const mockTheme = {
		noStyle: false,
		theme: {
			'dialog.root': {
				className: 'theme-class',
				style: { color: 'blue' },
			},
		},
	};

	test('returns component styles when no theme is provided', () => {
		const componentStyle = {
			className: 'component-class',
			style: { backgroundColor: 'red' },
		};

		const { result } = renderHook(
			() => useStyles('dialog.root', componentStyle),
			{
				wrapper: ({ children }) => (
					<GlobalThemeContext.Provider value={{ noStyle: false, theme: {} }}>
						{children}
					</GlobalThemeContext.Provider>
				),
			}
		);


		expect(result.current.className).toContain('component-class');
		expect(result.current.style).toEqual({ backgroundColor: 'red' });
	});

	test('merges theme and component styles correctly', () => {
		const componentStyle = {
			className: 'component-class',
			style: { backgroundColor: 'red' },
		};

		const { result } = renderHook(
			() => useStyles('dialog.root', componentStyle),
			{
				wrapper: ({ children }) => (
					<GlobalThemeContext.Provider value={mockTheme}>
						{children}
					</GlobalThemeContext.Provider>
				),
			}
		);

		expect(result.current.className).toContain('theme-class');
		expect(result.current.className).toContain('component-class');
		expect(result.current.style).toEqual({
			color: 'blue',
			backgroundColor: 'red',
		});
	});

	test('handles string className correctly', () => {
		const componentStyle = 'component-class';

		const { result } = renderHook(
			() => useStyles('dialog.root', componentStyle),
			{
				wrapper: ({ children }) => (
					<GlobalThemeContext.Provider value={mockTheme}>
						{children}
					</GlobalThemeContext.Provider>
				),
			}
		);

		expect(result.current.className).toContain('theme-class');
		expect(result.current.className).toContain('component-class');
	});
});
