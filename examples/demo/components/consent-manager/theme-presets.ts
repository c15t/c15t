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
 * Bubblegum — saturated pastels and bounce.
 * Shows: oversized radii, spring easing with slower durations, tinted
 * shadows, `lighter`-mode action buttons.
 */
const bubblegumTheme: Theme = {
	consentActions: {
		default: { variant: 'primary', mode: 'lighter' },
		accept: { variant: 'primary', mode: 'filled' },
	},
	colors: {
		primary: '#ec4899',
		primaryHover: '#db2777',
		surface: '#fff7fb',
		surfaceHover: '#ffeef7',
		border: '#fbcfe8',
		borderHover: '#f9a8d4',
		text: '#831843',
		textMuted: '#be5d8f',
		textOnPrimary: '#ffffff',
		overlay: 'rgba(131, 24, 67, 0.3)',
		switchTrack: '#fbcfe8',
		switchTrackActive: '#ec4899',
		switchThumb: '#ffffff',
	},
	dark: {
		primary: '#f472b6',
		primaryHover: '#ec4899',
		surface: '#2a0a1d',
		surfaceHover: '#3d1029',
		border: '#701a43',
		borderHover: '#9d2563',
		text: '#fce7f3',
		textMuted: '#e89ec4',
		textOnPrimary: '#500724',
		switchTrack: '#701a43',
		switchTrackActive: '#f472b6',
		switchThumb: '#fce7f3',
	},
	typography: {
		fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
		fontWeight: { normal: 450, medium: 600, semibold: 700 },
		lineHeight: { tight: '1.3', normal: '1.55', relaxed: '1.8' },
	},
	spacing: { md: '1.125rem', lg: '1.75rem' },
	radius: { sm: '0.75rem', md: '1.25rem', lg: '1.75rem', full: '9999px' },
	shadows: {
		sm: '0 2px 8px rgba(236, 72, 153, 0.12)',
		md: '0 8px 24px rgba(236, 72, 153, 0.18)',
		lg: '0 16px 48px rgba(236, 72, 153, 0.25)',
	},
	motion: {
		duration: { fast: '150ms', normal: '300ms', slow: '450ms' },
		easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
		easingOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
		easingSpring: 'cubic-bezier(0.34, 1.8, 0.64, 1)',
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
 * Glass — frosted translucency over the page.
 * Shows: slots layered on tokens — backdrop blur with `color-mix` against
 * the surface token, so the same slot styles adapt to light and dark mode.
 */
const glassTheme: Theme = {
	consentActions: {
		default: { variant: 'neutral', mode: 'lighter' },
		accept: { variant: 'primary', mode: 'filled' },
	},
	colors: {
		primary: '#6366f1',
		primaryHover: '#4f46e5',
		surface: '#ffffff',
		surfaceHover: '#f5f5ff',
		border: 'rgba(99, 102, 241, 0.2)',
		borderHover: 'rgba(99, 102, 241, 0.4)',
		text: '#1e1b4b',
		textMuted: '#6460a8',
		textOnPrimary: '#ffffff',
		overlay: 'rgba(30, 27, 75, 0.2)',
		switchTrack: 'rgba(99, 102, 241, 0.2)',
		switchTrackActive: '#6366f1',
		switchThumb: '#ffffff',
	},
	dark: {
		primary: '#a5b4fc',
		primaryHover: '#818cf8',
		surface: '#0f0d2a',
		surfaceHover: '#1a1740',
		border: 'rgba(165, 180, 252, 0.2)',
		borderHover: 'rgba(165, 180, 252, 0.4)',
		text: '#e0e7ff',
		textMuted: '#9fa8da',
		textOnPrimary: '#0f0d2a',
		switchTrack: 'rgba(165, 180, 252, 0.2)',
		switchTrackActive: '#a5b4fc',
		switchThumb: '#e0e7ff',
	},
	radius: { sm: '0.625rem', md: '1rem', lg: '1.5rem', full: '9999px' },
	shadows: {
		sm: '0 2px 8px rgba(30, 27, 75, 0.08)',
		md: '0 8px 32px rgba(30, 27, 75, 0.12)',
		lg: '0 24px 64px rgba(30, 27, 75, 0.2)',
	},
	slots: {
		consentBannerCard: {
			style: {
				backgroundColor:
					'color-mix(in srgb, var(--c15t-surface) 70%, transparent)',
				backdropFilter: 'blur(20px) saturate(160%)',
				WebkitBackdropFilter: 'blur(20px) saturate(160%)',
				border: '1px solid var(--c15t-border)',
			},
		},
		consentDialogCard: {
			style: {
				backgroundColor:
					'color-mix(in srgb, var(--c15t-surface) 75%, transparent)',
				backdropFilter: 'blur(24px) saturate(160%)',
				WebkitBackdropFilter: 'blur(24px) saturate(160%)',
				border: '1px solid var(--c15t-border)',
			},
		},
		iabConsentBannerCard: {
			style: {
				backgroundColor:
					'color-mix(in srgb, var(--c15t-surface) 70%, transparent)',
				backdropFilter: 'blur(20px) saturate(160%)',
				WebkitBackdropFilter: 'blur(20px) saturate(160%)',
				border: '1px solid var(--c15t-border)',
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
	bubblegum: {
		label: 'Bubblegum',
		description: 'Pastel pinks with springy motion',
		theme: bubblegumTheme,
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
		label: 'Glass',
		description: 'Frosted blur via slots + color-mix',
		theme: glassTheme,
	},
} as const satisfies Record<string, ThemePreset>;

export type ThemePresetName = keyof typeof themePresets;
