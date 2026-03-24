/**
 * Utility functions for processing the v2 theme system.
 * Handles token-to-CSS variable conversion and dark mode overrides.
 */

import type { ColorTokens, Theme, ThemeCSSVariables } from './types';

/**
 * Default design tokens for the v2 theme system.
 */
export const defaultDarkColors: Required<ColorTokens> = {
	primary: 'hsl(228, 100%, 70%)',
	primaryHover: 'hsl(228, 100%, 65%)',
	surface: 'hsl(0, 0%, 7%)',
	surfaceHover: 'hsl(0, 0%, 10%)',
	border: 'hsl(0, 0%, 20%)',
	borderHover: 'hsl(0, 0%, 25%)',
	text: 'hsl(0, 0%, 93%)',
	textMuted: 'hsl(0, 0%, 60%)',
	textOnPrimary: 'hsl(0, 0%, 100%)',
	overlay: 'hsla(0, 0%, 0%, 0.7)',
	switchTrack: 'hsl(0, 0%, 25%)',
	switchTrackActive: 'hsl(228, 100%, 70%)',
	switchThumb: 'hsl(0, 0%, 93%)',
};

export const defaultTheme: Required<Omit<Theme, 'slots'>> = {
	colors: {
		primary: 'hsl(228, 100%, 60%)',
		primaryHover: 'hsl(228, 100%, 55%)',
		surface: 'hsl(0, 0%, 100%)',
		surfaceHover: 'hsl(0, 0%, 98%)',
		border: 'hsl(0, 0%, 90%)',
		borderHover: 'hsl(0, 0%, 85%)',
		text: 'hsl(0, 0%, 10%)',
		textMuted: 'hsl(0, 0%, 40%)',
		textOnPrimary: 'hsl(0, 0%, 100%)',
		overlay: 'hsla(0, 0%, 0%, 0.5)',
		switchTrack: 'hsl(0, 0%, 85%)',
		switchTrackActive: 'hsl(228, 100%, 60%)',
		switchThumb: 'hsl(0, 0%, 100%)',
	},
	dark: defaultDarkColors,
	typography: {
		fontFamily: 'system-ui, -apple-system, sans-serif',
		fontSize: {
			sm: '0.875rem',
			base: '1rem',
			lg: '1.125rem',
		},
		fontWeight: {
			normal: 400,
			medium: 500,
			semibold: 600,
		},
		lineHeight: {
			tight: '1.25',
			normal: '1.5',
			relaxed: '1.75',
		},
	},
	spacing: {
		xs: '0.25rem',
		sm: '0.5rem',
		md: '1rem',
		lg: '1.5rem',
		xl: '2rem',
	},
	radius: {
		sm: '0.25rem',
		md: '0.5rem',
		lg: '0.75rem',
		full: '9999px',
	},
	shadows: {
		sm: '0 1px 2px hsla(0, 0%, 0%, 0.05)',
		md: '0 4px 12px hsla(0, 0%, 0%, 0.08)',
		lg: '0 8px 24px hsla(0, 0%, 0%, 0.12)',
	},
	consentActions: {},
	motion: {
		duration: {
			fast: '100ms',
			normal: '200ms',
			slow: '300ms',
		},
		easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
		// ease-out-cubic: fast start, smooth end - ideal for enter/exit
		easingOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
		// ease-in-out-cubic: smooth acceleration and deceleration - ideal for movement
		easingInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
		// Spring-like overshoot - ideal for playful animations
		easingSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
	},
};

type ThemeCSSVariableResolver = (
	theme: Theme,
	colors?: ColorTokens
) => string | undefined;

const themeCSSVariableResolvers: Record<
	keyof ThemeCSSVariables,
	ThemeCSSVariableResolver
> = {
	'--c15t-primary': (_theme, colors) => colors?.primary,
	'--c15t-primary-hover': (_theme, colors) => colors?.primaryHover,
	'--c15t-surface': (_theme, colors) => colors?.surface,
	'--c15t-surface-hover': (_theme, colors) => colors?.surfaceHover,
	'--c15t-border': (_theme, colors) => colors?.border,
	'--c15t-border-hover': (_theme, colors) => colors?.borderHover,
	'--c15t-text': (_theme, colors) => colors?.text,
	'--c15t-text-muted': (_theme, colors) => colors?.textMuted,
	'--c15t-text-on-primary': (_theme, colors) => colors?.textOnPrimary,
	'--c15t-overlay': (_theme, colors) => colors?.overlay,
	'--c15t-switch-track': (_theme, colors) => colors?.switchTrack,
	'--c15t-switch-track-active': (_theme, colors) => colors?.switchTrackActive,
	'--c15t-switch-thumb': (_theme, colors) => colors?.switchThumb,
	'--c15t-font-family': (theme) => theme.typography?.fontFamily,
	'--c15t-font-size-sm': (theme) => theme.typography?.fontSize?.sm,
	'--c15t-font-size-base': (theme) => theme.typography?.fontSize?.base,
	'--c15t-font-size-lg': (theme) => theme.typography?.fontSize?.lg,
	'--c15t-font-weight-normal': (theme) =>
		theme.typography?.fontWeight?.normal
			? String(theme.typography.fontWeight.normal)
			: undefined,
	'--c15t-font-weight-medium': (theme) =>
		theme.typography?.fontWeight?.medium
			? String(theme.typography.fontWeight.medium)
			: undefined,
	'--c15t-font-weight-semibold': (theme) =>
		theme.typography?.fontWeight?.semibold
			? String(theme.typography.fontWeight.semibold)
			: undefined,
	'--c15t-line-height-tight': (theme) => theme.typography?.lineHeight?.tight,
	'--c15t-line-height-normal': (theme) => theme.typography?.lineHeight?.normal,
	'--c15t-line-height-relaxed': (theme) =>
		theme.typography?.lineHeight?.relaxed,
	'--c15t-space-xs': (theme) => theme.spacing?.xs,
	'--c15t-space-sm': (theme) => theme.spacing?.sm,
	'--c15t-space-md': (theme) => theme.spacing?.md,
	'--c15t-space-lg': (theme) => theme.spacing?.lg,
	'--c15t-space-xl': (theme) => theme.spacing?.xl,
	'--c15t-radius-sm': (theme) => theme.radius?.sm,
	'--c15t-radius-md': (theme) => theme.radius?.md,
	'--c15t-radius-lg': (theme) => theme.radius?.lg,
	'--c15t-radius-full': (theme) => theme.radius?.full,
	'--c15t-shadow-sm': (theme) => theme.shadows?.sm,
	'--c15t-shadow-md': (theme) => theme.shadows?.md,
	'--c15t-shadow-lg': (theme) => theme.shadows?.lg,
	'--c15t-duration-fast': (theme) => theme.motion?.duration?.fast,
	'--c15t-duration-normal': (theme) => theme.motion?.duration?.normal,
	'--c15t-duration-slow': (theme) => theme.motion?.duration?.slow,
	'--c15t-easing': (theme) => theme.motion?.easing,
	'--c15t-easing-out': (theme) => theme.motion?.easingOut,
	'--c15t-easing-in-out': (theme) => theme.motion?.easingInOut,
	'--c15t-easing-spring': (theme) => theme.motion?.easingSpring,
};

/**
 * Maps theme tokens to CSS variables.
 */
export function themeToVars(theme: Theme, isDark = false): ThemeCSSVariables {
	const vars: ThemeCSSVariables = {};
	const colors = isDark ? { ...theme.colors, ...theme.dark } : theme.colors;

	for (const [key, resolve] of Object.entries(themeCSSVariableResolvers) as [
		keyof ThemeCSSVariables,
		ThemeCSSVariableResolver,
	][]) {
		const value = resolve(theme, colors);
		if (value) {
			vars[key] = value;
		}
	}

	return vars;
}

/**
 * Generates a CSS string for the theme variables.
 */
export function generateThemeCSS(theme: Theme): string {
	const lightVars = themeToVars(theme, false);
	const darkVars = themeToVars(theme, true);

	const lightCSS = Object.entries(lightVars)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => `${key}: ${value};`)
		.join('\n');

	const darkCSS = Object.entries(darkVars)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => `${key}: ${value};`)
		.join('\n');

	return `
:root, .c15t-theme-root {
${lightCSS}
}

:root.dark, .dark .c15t-theme-root, :root.c15t-dark, .c15t-dark .c15t-theme-root {
${darkCSS}
}

/*
 * Utility class to disable transitions during theme switching.
 * Apply this class to the root element before switching themes,
 * then remove it after a short delay to prevent flash of
 * animated content during the color scheme change.
 *
 * Example usage:
 *   document.documentElement.classList.add('c15t-no-transitions');
 *   // Switch theme...
 *   requestAnimationFrame(() => {
 *     document.documentElement.classList.remove('c15t-no-transitions');
 *   });
 */
.c15t-no-transitions,
.c15t-no-transitions *,
.c15t-no-transitions *::before,
.c15t-no-transitions *::after {
	transition: none !important;
	animation: none !important;
}
	`.trim();
}
