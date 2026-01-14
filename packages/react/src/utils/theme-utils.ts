/**
 * Utility functions for processing the v2 theme system.
 * Handles token-to-CSS variable conversion and dark mode overrides.
 */

import type { Theme } from '../types/theme/style-types';

/**
 * Default design tokens for the v2 theme system.
 */
export const defaultTheme: Required<Omit<Theme, 'slots' | 'dark'>> = {
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
	motion: {
		duration: {
			fast: '100ms',
			normal: '200ms',
			slow: '300ms',
		},
		easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
	},
};

/**
 * Maps theme tokens to CSS variables.
 */
export function themeToVars(
	theme: Theme,
	isDark = false
): Record<string, string> {
	const vars: Record<string, string> = {};
	const colors = isDark ? { ...theme.colors, ...theme.dark } : theme.colors;

	// Colors
	if (colors) {
		if (colors.primary) vars['--c15t-primary'] = colors.primary;
		if (colors.primaryHover) vars['--c15t-primary-hover'] = colors.primaryHover;
		if (colors.surface) vars['--c15t-surface'] = colors.surface;
		if (colors.surfaceHover) vars['--c15t-surface-hover'] = colors.surfaceHover;
		if (colors.border) vars['--c15t-border'] = colors.border;
		if (colors.borderHover) vars['--c15t-border-hover'] = colors.borderHover;
		if (colors.text) vars['--c15t-text'] = colors.text;
		if (colors.textMuted) vars['--c15t-text-muted'] = colors.textMuted;
		if (colors.textOnPrimary)
			vars['--c15t-text-on-primary'] = colors.textOnPrimary;
		if (colors.overlay) vars['--c15t-overlay'] = colors.overlay;
		if (colors.switchTrack) vars['--c15t-switch-track'] = colors.switchTrack;
		if (colors.switchTrackActive)
			vars['--c15t-switch-track-active'] = colors.switchTrackActive;
		if (colors.switchThumb) vars['--c15t-switch-thumb'] = colors.switchThumb;
	}

	// Typography
	if (theme.typography) {
		if (theme.typography.fontFamily)
			vars['--c15t-font-family'] = theme.typography.fontFamily;
		if (theme.typography.fontSize?.sm)
			vars['--c15t-font-size-sm'] = theme.typography.fontSize.sm;
		if (theme.typography.fontSize?.base)
			vars['--c15t-font-size-base'] = theme.typography.fontSize.base;
		if (theme.typography.fontSize?.lg)
			vars['--c15t-font-size-lg'] = theme.typography.fontSize.lg;
		if (theme.typography.fontWeight?.normal)
			vars['--c15t-font-weight-normal'] = String(
				theme.typography.fontWeight.normal
			);
		if (theme.typography.fontWeight?.medium)
			vars['--c15t-font-weight-medium'] = String(
				theme.typography.fontWeight.medium
			);
		if (theme.typography.fontWeight?.semibold)
			vars['--c15t-font-weight-semibold'] = String(
				theme.typography.fontWeight.semibold
			);
		if (theme.typography.lineHeight?.tight)
			vars['--c15t-line-height-tight'] = theme.typography.lineHeight.tight;
		if (theme.typography.lineHeight?.normal)
			vars['--c15t-line-height-normal'] = theme.typography.lineHeight.normal;
		if (theme.typography.lineHeight?.relaxed)
			vars['--c15t-line-height-relaxed'] = theme.typography.lineHeight.relaxed;
	}

	// Spacing
	if (theme.spacing) {
		if (theme.spacing.xs) vars['--c15t-space-xs'] = theme.spacing.xs;
		if (theme.spacing.sm) vars['--c15t-space-sm'] = theme.spacing.sm;
		if (theme.spacing.md) vars['--c15t-space-md'] = theme.spacing.md;
		if (theme.spacing.lg) vars['--c15t-space-lg'] = theme.spacing.lg;
		if (theme.spacing.xl) vars['--c15t-space-xl'] = theme.spacing.xl;
	}

	// Radius
	if (theme.radius) {
		if (theme.radius.sm) vars['--c15t-radius-sm'] = theme.radius.sm;
		if (theme.radius.md) vars['--c15t-radius-md'] = theme.radius.md;
		if (theme.radius.lg) vars['--c15t-radius-lg'] = theme.radius.lg;
		if (theme.radius.full) vars['--c15t-radius-full'] = theme.radius.full;
	}

	// Shadows
	if (theme.shadows) {
		if (theme.shadows.sm) vars['--c15t-shadow-sm'] = theme.shadows.sm;
		if (theme.shadows.md) vars['--c15t-shadow-md'] = theme.shadows.md;
		if (theme.shadows.lg) vars['--c15t-shadow-lg'] = theme.shadows.lg;
	}

	// Motion
	if (theme.motion) {
		if (theme.motion.duration?.fast)
			vars['--c15t-duration-fast'] = theme.motion.duration.fast;
		if (theme.motion.duration?.normal)
			vars['--c15t-duration-normal'] = theme.motion.duration.normal;
		if (theme.motion.duration?.slow)
			vars['--c15t-duration-slow'] = theme.motion.duration.slow;
		if (theme.motion.easing) vars['--c15t-easing'] = theme.motion.easing;
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
		.map(([key, value]) => `${key}: ${value};`)
		.join('\n');

	const darkCSS = Object.entries(darkVars)
		.map(([key, value]) => `${key}: ${value};`)
		.join('\n');

	return `
:root, .c15t-theme-root {
${lightCSS}
}

.dark :root, .dark .c15t-theme-root, .c15t-dark :root, .c15t-dark .c15t-theme-root {
${darkCSS}
}
	`.trim();
}
