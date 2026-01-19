import { describe, expect, test } from 'vitest';
import type { Theme } from '../types';
import { defaultTheme, generateThemeCSS, themeToVars } from '../utils';

describe('defaultTheme', () => {
	test('has all required color tokens', () => {
		expect(defaultTheme.colors.primary).toBeDefined();
		expect(defaultTheme.colors.surface).toBeDefined();
		expect(defaultTheme.colors.text).toBeDefined();
		expect(defaultTheme.colors.border).toBeDefined();
	});

	test('has typography settings', () => {
		expect(defaultTheme.typography.fontFamily).toBeDefined();
		expect(defaultTheme.typography.fontSize).toBeDefined();
		expect(defaultTheme.typography.fontWeight).toBeDefined();
	});

	test('has spacing scale', () => {
		expect(defaultTheme.spacing.xs).toBeDefined();
		expect(defaultTheme.spacing.sm).toBeDefined();
		expect(defaultTheme.spacing.md).toBeDefined();
		expect(defaultTheme.spacing.lg).toBeDefined();
		expect(defaultTheme.spacing.xl).toBeDefined();
	});

	test('has radius scale', () => {
		expect(defaultTheme.radius.sm).toBeDefined();
		expect(defaultTheme.radius.md).toBeDefined();
		expect(defaultTheme.radius.lg).toBeDefined();
		expect(defaultTheme.radius.full).toBeDefined();
	});

	test('has shadow scale', () => {
		expect(defaultTheme.shadows.sm).toBeDefined();
		expect(defaultTheme.shadows.md).toBeDefined();
		expect(defaultTheme.shadows.lg).toBeDefined();
	});

	test('has motion settings', () => {
		expect(defaultTheme.motion.duration).toBeDefined();
		expect(defaultTheme.motion.easing).toBeDefined();
	});
});

describe('themeToVars', () => {
	test('converts color tokens to CSS variables', () => {
		const theme: Theme = {
			colors: {
				primary: '#ff0000',
				surface: '#ffffff',
			},
		};
		const vars = themeToVars(theme);
		expect(vars['--c15t-primary']).toBe('#ff0000');
		expect(vars['--c15t-surface']).toBe('#ffffff');
	});

	test('converts typography tokens to CSS variables', () => {
		const theme: Theme = {
			typography: {
				fontFamily: 'Arial, sans-serif',
				fontSize: {
					sm: '0.875rem',
					base: '1rem',
				},
				fontWeight: {
					normal: 400,
					medium: 500,
				},
			},
		};
		const vars = themeToVars(theme);
		expect(vars['--c15t-font-family']).toBe('Arial, sans-serif');
		expect(vars['--c15t-font-size-sm']).toBe('0.875rem');
		expect(vars['--c15t-font-size-base']).toBe('1rem');
		expect(vars['--c15t-font-weight-normal']).toBe('400');
		expect(vars['--c15t-font-weight-medium']).toBe('500');
	});

	test('converts spacing tokens to CSS variables', () => {
		const theme: Theme = {
			spacing: {
				xs: '0.25rem',
				sm: '0.5rem',
				md: '1rem',
			},
		};
		const vars = themeToVars(theme);
		expect(vars['--c15t-space-xs']).toBe('0.25rem');
		expect(vars['--c15t-space-sm']).toBe('0.5rem');
		expect(vars['--c15t-space-md']).toBe('1rem');
	});

	test('converts radius tokens to CSS variables', () => {
		const theme: Theme = {
			radius: {
				sm: '4px',
				md: '8px',
				lg: '12px',
				full: '9999px',
			},
		};
		const vars = themeToVars(theme);
		expect(vars['--c15t-radius-sm']).toBe('4px');
		expect(vars['--c15t-radius-md']).toBe('8px');
		expect(vars['--c15t-radius-lg']).toBe('12px');
		expect(vars['--c15t-radius-full']).toBe('9999px');
	});

	test('converts shadow tokens to CSS variables', () => {
		const theme: Theme = {
			shadows: {
				sm: '0 1px 2px rgba(0,0,0,0.05)',
				md: '0 4px 6px rgba(0,0,0,0.1)',
			},
		};
		const vars = themeToVars(theme);
		expect(vars['--c15t-shadow-sm']).toBe('0 1px 2px rgba(0,0,0,0.05)');
		expect(vars['--c15t-shadow-md']).toBe('0 4px 6px rgba(0,0,0,0.1)');
	});

	test('converts motion tokens to CSS variables', () => {
		const theme: Theme = {
			motion: {
				duration: {
					fast: '100ms',
					normal: '200ms',
				},
				easing: 'ease-in-out',
			},
		};
		const vars = themeToVars(theme);
		expect(vars['--c15t-duration-fast']).toBe('100ms');
		expect(vars['--c15t-duration-normal']).toBe('200ms');
		expect(vars['--c15t-easing']).toBe('ease-in-out');
	});

	test('uses dark colors when isDark is true', () => {
		const theme: Theme = {
			colors: {
				surface: '#ffffff',
			},
			dark: {
				surface: '#000000',
			},
		};
		const lightVars = themeToVars(theme, false);
		const darkVars = themeToVars(theme, true);

		expect(lightVars['--c15t-surface']).toBe('#ffffff');
		expect(darkVars['--c15t-surface']).toBe('#000000');
	});

	test('returns empty object for empty theme', () => {
		const vars = themeToVars({});
		expect(Object.keys(vars)).toHaveLength(0);
	});

	test('only includes defined values', () => {
		const theme: Theme = {
			colors: {
				primary: '#ff0000',
				// other colors undefined
			},
		};
		const vars = themeToVars(theme);
		expect(vars['--c15t-primary']).toBe('#ff0000');
		expect(vars['--c15t-surface']).toBeUndefined();
	});
});

describe('generateThemeCSS', () => {
	test('generates CSS with :root selector', () => {
		const theme: Theme = {
			colors: {
				primary: '#ff0000',
			},
		};
		const css = generateThemeCSS(theme);
		expect(css).toContain(':root');
		expect(css).toContain('.c15t-theme-root');
	});

	test('includes light mode variables', () => {
		const theme: Theme = {
			colors: {
				primary: '#ff0000',
			},
		};
		const css = generateThemeCSS(theme);
		expect(css).toContain('--c15t-primary: #ff0000');
	});

	test('includes dark mode selector', () => {
		const theme: Theme = {
			colors: {
				primary: '#ff0000',
			},
			dark: {
				primary: '#cc0000',
			},
		};
		const css = generateThemeCSS(theme);
		expect(css).toContain('.dark');
		expect(css).toContain('.c15t-dark');
	});

	test('generates valid CSS structure', () => {
		const theme: Theme = {
			colors: {
				primary: '#ff0000',
				surface: '#ffffff',
			},
		};
		const css = generateThemeCSS(theme);
		// Should have opening and closing braces
		expect(css.match(/{/g)?.length).toBe(2); // light and dark selectors
		expect(css.match(/}/g)?.length).toBe(2);
	});
});
