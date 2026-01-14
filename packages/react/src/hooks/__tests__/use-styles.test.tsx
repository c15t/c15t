import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { GlobalThemeContext } from '~/context/theme-context';
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
	};

	test('returns component styles when no theme is provided', async () => {
		const componentStyle = {
			className: 'component-class',
			style: { backgroundColor: 'red' },
		};

		const { result } = await renderHook(
			() => useStyles('dialogCard', componentStyle),
			{
				wrapper: ({ children }) => (
					<GlobalThemeContext.Provider
						value={{ noStyle: false, theme: { slots: {} } as any }}
					>
						{children}
					</GlobalThemeContext.Provider>
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
					<GlobalThemeContext.Provider value={mockTheme as any}>
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

	test('handles string className correctly', async () => {
		const componentStyle = 'component-class';

		const { result } = await renderHook(
			() => useStyles('dialogCard', componentStyle),
			{
				wrapper: ({ children }) => (
					<GlobalThemeContext.Provider value={mockTheme as any}>
						{children}
					</GlobalThemeContext.Provider>
				),
			}
		);

		expect(result.current.className).toContain('theme-class');
		expect(result.current.className).toContain('component-class');
	});

	test('should remove default styles but keep custom classNames when theme object provides noStyle: true', async () => {
		const mockNoStyleTheme = {
			theme: {
				slots: {
					dialogCard: {
						className: 'theme-class',
						style: { color: 'blue' },
						noStyle: true,
					},
				},
			},
		};

		const componentStyle = {
			className: 'component-class',
			style: { backgroundColor: 'red' },
			noStyle: true,
		};

		const { result } = await renderHook(
			() => useStyles('dialogCard', componentStyle),
			{
				wrapper: ({ children }) => (
					<GlobalThemeContext.Provider value={mockNoStyleTheme as any}>
						{children}
					</GlobalThemeContext.Provider>
				),
			}
		);

		expect(result.current.className).toContain('theme-class');
		expect(result.current.className).not.toContain('component-class');
		expect(result.current.style).toEqual({ color: 'blue' });
	});
});
