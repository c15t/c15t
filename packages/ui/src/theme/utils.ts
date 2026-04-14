/**
 * Utility functions for processing the v2 theme system.
 * Handles token-to-CSS variable conversion and dark mode overrides.
 */

import type { ColorTokens, Theme, ThemeCSSVariables } from './types';

type RGBColor = {
	r: number;
	g: number;
	b: number;
};

const DEFAULT_LIGHT_CONTRAST_COLOR = '#ffffff';
const DEFAULT_DARK_CONTRAST_COLOR = '#000000';

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
			fast: '80ms',
			normal: '150ms',
			slow: '200ms',
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

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function parsePercentage(value: string): number | null {
	if (!value.trim().endsWith('%')) {
		return null;
	}

	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? clamp(parsed / 100, 0, 1) : null;
}

function parseRGBChannel(value: string): number | null {
	const percent = parsePercentage(value);
	if (percent !== null) {
		return Math.round(percent * 255);
	}

	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? clamp(parsed, 0, 255) : null;
}

function parseHue(value: string): number | null {
	const trimmedValue = value.trim().toLowerCase();
	const parsed = Number.parseFloat(trimmedValue);

	if (!Number.isFinite(parsed)) {
		return null;
	}

	if (trimmedValue.endsWith('turn')) {
		return parsed * 360;
	}

	if (trimmedValue.endsWith('rad')) {
		return (parsed * 180) / Math.PI;
	}

	if (trimmedValue.endsWith('grad')) {
		return parsed * 0.9;
	}

	return parsed;
}

function parseColorChannels(value: string): string[] {
	const channels = value.split('/')[0] ?? '';
	return channels.includes(',')
		? channels.split(/\s*,\s*/)
		: channels.trim().split(/\s+/);
}

function hslToRgb(h: number, s: number, l: number): RGBColor {
	const normalizedHue = ((h % 360) + 360) % 360;
	const saturation = clamp(s, 0, 1);
	const lightness = clamp(l, 0, 1);

	if (saturation === 0) {
		const channel = Math.round(lightness * 255);
		return { r: channel, g: channel, b: channel };
	}

	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const huePrime = normalizedHue / 60;
	const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
	let red = 0;
	let green = 0;
	let blue = 0;

	if (huePrime >= 0 && huePrime < 1) {
		red = chroma;
		green = secondary;
	} else if (huePrime >= 1 && huePrime < 2) {
		red = secondary;
		green = chroma;
	} else if (huePrime >= 2 && huePrime < 3) {
		green = chroma;
		blue = secondary;
	} else if (huePrime >= 3 && huePrime < 4) {
		green = secondary;
		blue = chroma;
	} else if (huePrime >= 4 && huePrime < 5) {
		red = secondary;
		blue = chroma;
	} else {
		red = chroma;
		blue = secondary;
	}

	const match = lightness - chroma / 2;

	return {
		r: Math.round((red + match) * 255),
		g: Math.round((green + match) * 255),
		b: Math.round((blue + match) * 255),
	};
}

function parseHexColor(value: string): RGBColor | null {
	const trimmedValue = value.trim();
	const hex = trimmedValue.startsWith('#')
		? trimmedValue.slice(1)
		: trimmedValue;

	if (!/^[\da-f]{3,4}$|^[\da-f]{6}$|^[\da-f]{8}$/i.test(hex)) {
		return null;
	}

	const normalizedHex =
		hex.length <= 4
			? hex
					.slice(0, 3)
					.split('')
					.map((channel) => `${channel}${channel}`)
					.join('')
			: hex.slice(0, 6);

	return {
		r: Number.parseInt(normalizedHex.slice(0, 2), 16),
		g: Number.parseInt(normalizedHex.slice(2, 4), 16),
		b: Number.parseInt(normalizedHex.slice(4, 6), 16),
	};
}

function parseRGBColor(value: string): RGBColor | null {
	const match = value.trim().match(/^rgba?\((.+)\)$/i);

	if (!match) {
		return null;
	}

	const channels = parseColorChannels(match[1] ?? '').slice(0, 3);

	if (channels.length !== 3) {
		return null;
	}

	const [red, green, blue] = channels.map(parseRGBChannel);

	if ([red, green, blue].some((channel) => channel === null)) {
		return null;
	}

	return {
		r: red ?? 0,
		g: green ?? 0,
		b: blue ?? 0,
	};
}

function parseHSLColor(value: string): RGBColor | null {
	const match = value.trim().match(/^hsla?\((.+)\)$/i);

	if (!match) {
		return null;
	}

	const channels = parseColorChannels(match[1] ?? '').slice(0, 3);

	if (channels.length !== 3) {
		return null;
	}

	const hue = parseHue(channels[0] ?? '');
	const saturation = parsePercentage(channels[1] ?? '');
	const lightness = parsePercentage(channels[2] ?? '');

	if (hue === null || saturation === null || lightness === null) {
		return null;
	}

	return hslToRgb(hue, saturation, lightness);
}

function parseColor(value: string): RGBColor | null {
	return parseHexColor(value) ?? parseRGBColor(value) ?? parseHSLColor(value);
}

function srgbToLinear(channel: number): number {
	const normalizedChannel = channel / 255;
	return normalizedChannel <= 0.04045
		? normalizedChannel / 12.92
		: ((normalizedChannel + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(color: RGBColor): number {
	return (
		0.2126 * srgbToLinear(color.r) +
		0.7152 * srgbToLinear(color.g) +
		0.0722 * srgbToLinear(color.b)
	);
}

function getContrastRatio(foreground: RGBColor, background: RGBColor): number {
	const foregroundLuminance = getRelativeLuminance(foreground);
	const backgroundLuminance = getRelativeLuminance(background);
	const lighterColor = Math.max(foregroundLuminance, backgroundLuminance);
	const darkerColor = Math.min(foregroundLuminance, backgroundLuminance);

	return (lighterColor + 0.05) / (darkerColor + 0.05);
}

/**
 * Resolves a readable foreground color for a given background color.
 *
 * Supports `#rgb`, `#rrggbb`, `rgb()`, and `hsl()` input formats.
 * Falls back to white when the background color cannot be parsed.
 */
export function getContrastColor(
	backgroundColor: string,
	{
		light = DEFAULT_LIGHT_CONTRAST_COLOR,
		dark = DEFAULT_DARK_CONTRAST_COLOR,
	}: {
		light?: string;
		dark?: string;
	} = {}
): string {
	const background = parseColor(backgroundColor);
	const lightColor = parseColor(light);
	const darkColor = parseColor(dark);

	if (!background || !lightColor || !darkColor) {
		return light;
	}

	return getContrastRatio(darkColor, background) >=
		getContrastRatio(lightColor, background)
		? dark
		: light;
}

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
	'--c15t-text-on-primary': (_theme, colors) =>
		colors?.textOnPrimary ??
		(colors?.primary ? getContrastColor(colors.primary) : undefined),
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
