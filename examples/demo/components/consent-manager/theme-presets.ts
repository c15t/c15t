import type { Theme } from '@c15t/react';

/**
 * Theme presets for the demo.
 *
 * Each preset deliberately leans on a different part of c15t's base theme
 * system — tokens (colors/dark, typography, spacing, radius, shadows,
 * motion), `consentActions` button treatments, and slots — to show how far
 * the stock components can be pushed without headless mode or compound
 * components.
 */

/**
 * Minimal — quiet neutral baseline.
 * Shows: restrained color tokens, small radii, hairline borders.
 */
const minimalTheme: Theme = {
	consentActions: {
		default: { mode: 'stroke' },
		customize: { variant: 'primary' },
	},
	colors: {
		primary: '#18181b',
		primaryHover: '#27272a',
		surface: '#ffffff',
		surfaceHover: '#fafafa',
		border: '#e4e4e7',
		borderHover: '#d4d4d8',
		text: '#18181b',
		textMuted: '#71717a',
		textOnPrimary: '#ffffff',
		switchTrack: '#d4d4d8',
		switchTrackActive: '#18181b',
		switchThumb: '#ffffff',
	},
	dark: {
		primary: '#fafafa',
		primaryHover: '#e4e4e7',
		surface: '#0a0a0a',
		surfaceHover: '#171717',
		border: '#27272a',
		borderHover: '#3f3f46',
		text: '#fafafa',
		textMuted: '#a1a1aa',
		textOnPrimary: '#09090b',
	},
	typography: {
		fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
		fontSize: { sm: '0.8125rem', base: '0.875rem', lg: '1rem' },
		fontWeight: { normal: 400, medium: 500, semibold: 500 },
	},
	radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', full: '9999px' },
	shadows: {
		sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
		md: '0 2px 8px rgba(0, 0, 0, 0.06)',
		lg: '0 4px 16px rgba(0, 0, 0, 0.08)',
	},
};

/**
 * Brutalist — flat color, hard edges, offset shadows.
 * Shows: zero radius, shadow tokens as a graphic device, mono type,
 * instant linear motion.
 */
const brutalistTheme: Theme = {
	consentActions: {
		default: { variant: 'neutral', mode: 'stroke' },
		accept: { variant: 'primary', mode: 'filled' },
	},
	colors: {
		primary: '#1d4ed8',
		primaryHover: '#1e40af',
		surface: '#fffdf5',
		surfaceHover: '#fef9c3',
		border: '#0a0a0a',
		borderHover: '#0a0a0a',
		text: '#0a0a0a',
		textMuted: '#404040',
		textOnPrimary: '#ffffff',
		overlay: 'rgba(250, 204, 21, 0.25)',
		switchTrack: '#fffdf5',
		switchTrackActive: '#1d4ed8',
		switchThumb: '#0a0a0a',
	},
	dark: {
		primary: '#facc15',
		primaryHover: '#eab308',
		surface: '#0a0a0a',
		surfaceHover: '#171717',
		border: '#fafafa',
		borderHover: '#fafafa',
		text: '#fafafa',
		textMuted: '#d4d4d4',
		textOnPrimary: '#0a0a0a',
		switchTrack: '#0a0a0a',
		switchTrackActive: '#facc15',
		switchThumb: '#fafafa',
	},
	typography: {
		fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
		fontWeight: { normal: 400, medium: 600, semibold: 700 },
		lineHeight: { tight: '1.2', normal: '1.45', relaxed: '1.6' },
	},
	radius: { sm: '0', md: '0', lg: '0', full: '0' },
	shadows: {
		sm: '2px 2px 0 var(--c15t-border)',
		md: '4px 4px 0 var(--c15t-border)',
		lg: '8px 8px 0 var(--c15t-border)',
	},
	motion: {
		duration: { fast: '60ms', normal: '100ms', slow: '160ms' },
		easing: 'linear',
		easingOut: 'linear',
		easingInOut: 'linear',
	},
	slots: {
		consentBannerCard: {
			style: { border: '2px solid var(--c15t-border)' },
		},
		consentDialogCard: {
			style: { border: '2px solid var(--c15t-border)' },
		},
		iabConsentBannerCard: {
			style: { border: '2px solid var(--c15t-border)' },
		},
		buttonPrimary: {
			style: {
				border: '2px solid var(--c15t-border)',
				boxShadow: '3px 3px 0 var(--c15t-border)',
			},
		},
		buttonSecondary: {
			style: {
				border: '2px solid var(--c15t-border)',
				boxShadow: '3px 3px 0 var(--c15t-border)',
			},
		},
	},
};

/**
 * Aurora — gradient-brand SaaS look.
 * Shows: className + style slots together (gradient primary button with a
 * Tailwind hover), tinted shadows, spring easing on enter/exit.
 */
const auroraTheme: Theme = {
	consentActions: {
		default: { variant: 'neutral', mode: 'lighter' },
		accept: { variant: 'primary', mode: 'filled' },
	},
	colors: {
		primary: '#7c3aed',
		primaryHover: '#6d28d9',
		surface: '#ffffff',
		surfaceHover: '#f8f7ff',
		border: '#e9e5f8',
		borderHover: '#d6cef2',
		text: '#1e1b2e',
		textMuted: '#6f6a85',
		textOnPrimary: '#ffffff',
		overlay: 'rgba(30, 27, 46, 0.4)',
		switchTrack: '#e9e5f8',
		switchTrackActive: '#7c3aed',
		switchThumb: '#ffffff',
	},
	dark: {
		primary: '#a78bfa',
		primaryHover: '#8b5cf6',
		surface: '#13101f',
		surfaceHover: '#1c1730',
		border: '#2e2749',
		borderHover: '#443a6b',
		text: '#ece9f8',
		textMuted: '#9d95bd',
		textOnPrimary: '#13101f',
		switchTrack: '#2e2749',
		switchTrackActive: '#a78bfa',
		switchThumb: '#ece9f8',
	},
	radius: { sm: '0.5rem', md: '0.75rem', lg: '1.125rem', full: '9999px' },
	shadows: {
		sm: '0 2px 8px rgba(124, 58, 237, 0.08)',
		md: '0 8px 24px rgba(124, 58, 237, 0.12)',
		lg: '0 16px 48px rgba(124, 58, 237, 0.18)',
	},
	motion: {
		duration: { fast: '120ms', normal: '240ms', slow: '360ms' },
		easingOut: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
	},
	slots: {
		buttonPrimary: {
			className: 'transition hover:brightness-110',
			style: {
				background:
					'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #ec4899 130%)',
				border: 'none',
				boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
			},
		},
	},
};

/**
 * Terminal — always-dark CRT phosphor.
 * Shows: an always-dark base palette (no `dark` block needed), mono type,
 * glow shadows, stepped easing, sharp corners.
 */
const terminalTheme: Theme = {
	consentActions: {
		default: { variant: 'primary', mode: 'stroke' },
		accept: { variant: 'primary', mode: 'filled' },
	},
	colors: {
		primary: '#22c55e',
		primaryHover: '#4ade80',
		surface: '#030d06',
		surfaceHover: '#06170c',
		border: '#14532d',
		borderHover: '#16a34a',
		text: '#86efac',
		textMuted: '#3f9e63',
		textOnPrimary: '#021006',
		overlay: 'rgba(2, 16, 6, 0.8)',
		switchTrack: '#14532d',
		switchTrackActive: '#22c55e',
		switchThumb: '#86efac',
	},
	typography: {
		fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
		fontSize: { sm: '0.8125rem', base: '0.875rem', lg: '1rem' },
		lineHeight: { tight: '1.3', normal: '1.6', relaxed: '1.8' },
	},
	radius: { sm: '0', md: '0', lg: '0', full: '0' },
	shadows: {
		sm: '0 0 8px rgba(34, 197, 94, 0.15)',
		md: '0 0 24px rgba(34, 197, 94, 0.2)',
		lg: '0 0 48px rgba(34, 197, 94, 0.3)',
	},
	motion: {
		duration: { fast: '50ms', normal: '120ms', slow: '200ms' },
		easing: 'steps(4, end)',
	},
	slots: {
		consentBannerCard: {
			style: { border: '1px solid var(--c15t-border)' },
		},
		iabConsentBannerCard: {
			style: { border: '1px solid var(--c15t-border)' },
		},
	},
};

/**
 * Editorial — warm paper and serif type.
 * Shows: typography tokens carrying the design, relaxed line heights,
 * generous spacing, ghost/stroke action treatments.
 */
const editorialTheme: Theme = {
	consentActions: {
		default: { variant: 'neutral', mode: 'ghost' },
		accept: { variant: 'primary', mode: 'filled' },
		customize: { variant: 'neutral', mode: 'stroke' },
	},
	colors: {
		primary: '#9a3412',
		primaryHover: '#7c2d12',
		surface: '#faf6ef',
		surfaceHover: '#f3ecdf',
		border: '#e0d5c0',
		borderHover: '#c9b896',
		text: '#1c1917',
		textMuted: '#78716c',
		textOnPrimary: '#faf6ef',
		overlay: 'rgba(28, 25, 23, 0.4)',
		switchTrack: '#e0d5c0',
		switchTrackActive: '#9a3412',
		switchThumb: '#faf6ef',
	},
	dark: {
		primary: '#fdba74',
		primaryHover: '#fb923c',
		surface: '#1c1410',
		surfaceHover: '#292017',
		border: '#44362a',
		borderHover: '#5f4c3a',
		text: '#f5ede3',
		textMuted: '#b3a18c',
		textOnPrimary: '#1c1410',
		switchTrack: '#44362a',
		switchTrackActive: '#fdba74',
		switchThumb: '#f5ede3',
	},
	typography: {
		fontFamily: "Georgia, 'Times New Roman', serif",
		fontSize: { sm: '0.9375rem', base: '1.0625rem', lg: '1.25rem' },
		fontWeight: { normal: 400, medium: 500, semibold: 600 },
		lineHeight: { tight: '1.35', normal: '1.65', relaxed: '1.85' },
	},
	spacing: { md: '1.25rem', lg: '1.75rem', xl: '2.5rem' },
	radius: { sm: '0.125rem', md: '0.25rem', lg: '0.375rem', full: '9999px' },
	shadows: {
		sm: '0 1px 2px rgba(28, 25, 23, 0.06)',
		md: '0 4px 12px rgba(28, 25, 23, 0.08)',
		lg: '0 12px 32px rgba(28, 25, 23, 0.12)',
	},
	motion: {
		duration: { fast: '120ms', normal: '240ms', slow: '360ms' },
	},
};

/**
 * Liquid Glass — frosted, refractive surfaces inspired by
 * https://aave.com/design/building-glass-for-the-web. The gradient wash is
 * built on `color-mix` over the surface token (so it adapts to dark mode)
 * and specular rim lighting comes from stacked inset shadows. The backdrop
 * filter lives in the `liquid-glass-card` class (app CSS): a frosted blur by
 * default, upgraded to true edge refraction via an SVG displacement-map
 * filter (`LiquidGlassFilter`) on browsers that support SVG-referenced
 * backdrop filters.
 */
const liquidGlassSurface = {
	background:
		'linear-gradient(135deg, color-mix(in srgb, var(--c15t-surface) 72%, transparent) 0%, color-mix(in srgb, var(--c15t-surface) 48%, transparent) 100%)',
	border: '1px solid color-mix(in srgb, var(--c15t-text) 10%, transparent)',
	boxShadow: [
		// specular rim: bright top edge, soft side glints, shaded bottom edge
		'inset 0 1px 1px rgba(255, 255, 255, 0.55)',
		'inset 1px 0 1px rgba(255, 255, 255, 0.18)',
		'inset -1px 0 1px rgba(255, 255, 255, 0.18)',
		'inset 0 -1px 1px rgba(0, 0, 0, 0.08)',
		// depth
		'0 16px 40px rgba(10, 8, 32, 0.18)',
		'0 4px 12px rgba(10, 8, 32, 0.08)',
	].join(', '),
};

const liquidGlassTag = {
	background: 'color-mix(in srgb, var(--c15t-primary) 82%, transparent)',
	backdropFilter: 'blur(12px) saturate(160%)',
	WebkitBackdropFilter: 'blur(12px) saturate(160%)',
	border: '1px solid rgba(255, 255, 255, 0.35)',
	borderRadius: 'var(--c15t-radius-full)',
	boxShadow:
		'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 4px 12px rgba(10, 8, 32, 0.18)',
	// Float clear of the card instead of fusing to its top edge, and pull in
	// from the corner so it does not overhang the large radius.
	marginBlockEnd: '0.5rem',
	marginInlineEnd: '1.25rem',
};

const glassTheme: Theme = {
	consentActions: {
		default: { variant: 'neutral', mode: 'lighter' },
		accept: { variant: 'primary', mode: 'filled' },
	},
	colors: {
		primary: '#4f46e5',
		primaryHover: '#4338ca',
		surface: '#fdfdff',
		surfaceHover: '#f4f4ff',
		border: 'rgba(30, 27, 75, 0.12)',
		borderHover: 'rgba(30, 27, 75, 0.25)',
		text: '#1e1b4b',
		textMuted: '#5b5786',
		textOnPrimary: '#ffffff',
		overlay: 'rgba(30, 27, 75, 0.15)',
		switchTrack: 'rgba(30, 27, 75, 0.15)',
		switchTrackActive: '#4f46e5',
		switchThumb: '#ffffff',
	},
	dark: {
		primary: '#a5b4fc',
		primaryHover: '#c7d2fe',
		surface: '#100e24',
		surfaceHover: '#191540',
		border: 'rgba(199, 210, 254, 0.18)',
		borderHover: 'rgba(199, 210, 254, 0.35)',
		text: '#e0e7ff',
		textMuted: '#9fa8da',
		textOnPrimary: '#100e24',
		overlay: 'rgba(5, 4, 18, 0.35)',
		switchTrack: 'rgba(199, 210, 254, 0.2)',
		switchTrackActive: '#a5b4fc',
		switchThumb: '#e0e7ff',
	},
	radius: { sm: '0.75rem', md: '1.125rem', lg: '1.75rem', full: '9999px' },
	shadows: {
		sm: '0 2px 8px rgba(10, 8, 32, 0.08)',
		md: '0 8px 32px rgba(10, 8, 32, 0.12)',
		lg: '0 24px 64px rgba(10, 8, 32, 0.2)',
	},
	motion: {
		duration: { fast: '140ms', normal: '280ms', slow: '420ms' },
		easingOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
	},
	slots: {
		consentBannerCard: {
			className: 'liquid-glass-card',
			style: liquidGlassSurface,
		},
		consentDialogCard: {
			className: 'liquid-glass-card',
			style: liquidGlassSurface,
		},
		iabConsentBannerCard: {
			className: 'liquid-glass-card',
			style: liquidGlassSurface,
		},
		// The stock branding tag is an opaque tab fused to the card's top
		// edge, which clashes with a translucent card and overhangs its large
		// corner radius. Restyle it as a small floating glass pill.
		consentBannerTag: { style: liquidGlassTag },
		consentDialogTag: { style: liquidGlassTag },
		iabConsentBannerTag: { style: liquidGlassTag },
		buttonSecondary: {
			style: {
				background: 'color-mix(in srgb, var(--c15t-surface) 45%, transparent)',
				backdropFilter: 'blur(10px)',
				WebkitBackdropFilter: 'blur(10px)',
				border:
					'1px solid color-mix(in srgb, var(--c15t-text) 12%, transparent)',
				boxShadow:
					'inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 2px 8px rgba(10, 8, 32, 0.08)',
			},
		},
	},
};

export interface ThemePreset {
	label: string;
	description: string;
	theme: Theme | undefined;
}

export const themePresets = {
	none: {
		label: 'Default',
		description: 'Base c15t styling, untouched',
		theme: undefined,
	},
	minimal: {
		label: 'Minimal',
		description: 'Quiet neutrals, hairline borders',
		theme: minimalTheme,
	},
	brutalist: {
		label: 'Brutalist',
		description: 'Hard edges, offset shadows, mono type',
		theme: brutalistTheme,
	},
	aurora: {
		label: 'Aurora',
		description: 'Gradient brand buttons, tinted shadows',
		theme: auroraTheme,
	},
	terminal: {
		label: 'Terminal',
		description: 'Always-dark CRT green phosphor',
		theme: terminalTheme,
	},
	editorial: {
		label: 'Editorial',
		description: 'Warm paper, serif typography',
		theme: editorialTheme,
	},
	glass: {
		label: 'Liquid Glass',
		description: 'Frosted, light-catching surfaces',
		theme: glassTheme,
	},
} as const satisfies Record<string, ThemePreset>;

export type ThemePresetName = keyof typeof themePresets;
