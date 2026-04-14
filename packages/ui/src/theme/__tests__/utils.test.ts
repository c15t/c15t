import { describe, expect, test } from 'vitest';
import type { Theme } from '../types';
import {
	defaultTheme,
	generateThemeCSS,
	getContrastColor,
	themeToVars,
} from '../utils';

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
		expect(defaultTheme.motion.easingOut).toBeDefined();
		expect(defaultTheme.motion.easingInOut).toBeDefined();
		expect(defaultTheme.motion.easingSpring).toBeDefined();
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

	test('converts switch color tokens to CSS variables', () => {
		const theme: Theme = {
			colors: {
				switchTrack: '#123456',
				switchTrackActive: '#654321',
			},
		};
		const vars = themeToVars(theme);
		expect(vars['--c15t-switch-track']).toBe('#123456');
		expect(vars['--c15t-switch-track-active']).toBe('#654321');
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
				easingOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
				easingInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
				easingSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
			},
		};
		const vars = themeToVars(theme);
		expect(vars['--c15t-duration-fast']).toBe('100ms');
		expect(vars['--c15t-duration-normal']).toBe('200ms');
		expect(vars['--c15t-easing']).toBe('ease-in-out');
		expect(vars['--c15t-easing-out']).toBe(
			'cubic-bezier(0.215, 0.61, 0.355, 1)'
		);
		expect(vars['--c15t-easing-in-out']).toBe(
			'cubic-bezier(0.645, 0.045, 0.355, 1)'
		);
		expect(vars['--c15t-easing-spring']).toBe(
			'cubic-bezier(0.34, 1.56, 0.64, 1)'
		);
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

	test('derives text-on-primary when primary is bright', () => {
		const vars = themeToVars({
			colors: {
				primary: '#2ed1c3',
			},
		});

		expect(vars['--c15t-text-on-primary']).toBe('#000000');
	});

	test('derives text-on-primary from dark primary overrides', () => {
		const vars = themeToVars(
			{
				colors: {
					primary: '#fafafa',
				},
				dark: {
					primary: '#16324f',
				},
			},
			true
		);

		expect(vars['--c15t-text-on-primary']).toBe('#ffffff');
	});

	test('preserves explicit text-on-primary overrides', () => {
		const vars = themeToVars({
			colors: {
				primary: '#2ed1c3',
				textOnPrimary: '#112233',
			},
		});

		expect(vars['--c15t-text-on-primary']).toBe('#112233');
	});
});

describe('getContrastColor', () => {
	test('returns dark text for bright backgrounds', () => {
		expect(getContrastColor('#2ed1c3')).toBe('#000000');
	});

	test('returns light text for dark backgrounds', () => {
		expect(getContrastColor('hsl(210, 57%, 20%)')).toBe('#ffffff');
	});

	test('supports rgb color inputs', () => {
		expect(getContrastColor('rgb(255, 214, 10)')).toBe('#000000');
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

	test('includes switch token variables in generated CSS', () => {
		const theme: Theme = {
			colors: {
				switchTrack: '#123456',
				switchTrackActive: '#654321',
			},
		};
		const css = generateThemeCSS(theme);
		expect(css).toContain('--c15t-switch-track: #123456');
		expect(css).toContain('--c15t-switch-track-active: #654321');
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

	test('uses base colors in dark mode when dark overrides are not provided', () => {
		const theme: Theme = {
			colors: {
				primary: '#123456',
			},
		};
		const css = generateThemeCSS(theme);

		expect(css).toContain('--c15t-primary: #123456');
		expect(css).not.toContain('--c15t-surface: hsl(0, 0%, 7%)');
		expect(css).not.toContain('--c15t-primary: hsl(228, 100%, 70%)');
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
		// (light, dark, and no-transitions utility with pseudo-elements = 4 selectors)
		const openBraces = css.match(/{/g)?.length ?? 0;
		const closeBraces = css.match(/}/g)?.length ?? 0;
		expect(openBraces).toBe(closeBraces);
		expect(openBraces).toBeGreaterThanOrEqual(3);
	});

	test('uses compound selectors for dark mode on :root', () => {
		const theme: Theme = {
			colors: {
				primary: '#ff0000',
			},
			dark: {
				primary: '#cc0000',
			},
		};
		const css = generateThemeCSS(theme);

		// Should use compound selectors (:root.dark) not descendant selectors (.dark :root)
		expect(css).toContain(':root.dark');
		expect(css).toContain(':root.c15t-dark');
		expect(css).not.toContain('.dark :root');
		expect(css).not.toContain('.c15t-dark :root');

		// Descendant selectors for .c15t-theme-root should still be used
		expect(css).toContain('.dark .c15t-theme-root');
		expect(css).toContain('.c15t-dark .c15t-theme-root');
	});

	test('includes no-transitions utility class', () => {
		const theme: Theme = {
			colors: {
				primary: '#ff0000',
			},
		};
		const css = generateThemeCSS(theme);
		expect(css).toContain('.c15t-no-transitions');
		expect(css).toContain('transition: none !important');
		expect(css).toContain('animation: none !important');
	});
});
