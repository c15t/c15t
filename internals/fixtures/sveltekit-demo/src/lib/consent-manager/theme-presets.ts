import type { Theme } from '@c15t/svelte';

export const minimalTheme: Theme = {
	colors: {
		border: '#e4e4e7',
		borderHover: '#d4d4d8',
		primary: '#18181b',
		primaryHover: '#27272a',
		surface: '#ffffff',
		surfaceHover: '#fafafa',
		switchThumb: '#ffffff',
		switchTrack: '#d4d4d8',
		switchTrackActive: '#18181b',
		text: '#18181b',
		textMuted: '#71717a',
		textOnPrimary: '#ffffff',
	},
	dark: {
		border: '#27272a',
		borderHover: '#3f3f46',
		primary: '#fafafa',
		primaryHover: '#e4e4e7',
		surface: '#0a0a0a',
		surfaceHover: '#171717',
		text: '#fafafa',
		textMuted: '#a1a1aa',
		textOnPrimary: '#09090b',
	},
	radius: { full: '9999px', lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
	shadows: {
		lg: '0 4px 16px rgba(0, 0, 0, 0.08)',
		md: '0 2px 8px rgba(0, 0, 0, 0.06)',
		sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
	},
	slots: {
		buttonPrimary: {
			style: {
				borderRadius: 'var(--c15t-radius-sm)',
				boxShadow: 'none',
				fontWeight: 500,
			},
		},
		buttonSecondary: {
			style: {
				backgroundColor: 'transparent',
				border: '1px solid var(--c15t-border)',
				borderRadius: 'var(--c15t-radius-sm)',
				boxShadow: 'none',
				color: 'var(--c15t-text-muted)',
				fontWeight: 500,
			},
		},
		consentBannerCard: {
			style: {
				border: '1px solid var(--c15t-border)',
				boxShadow: 'var(--c15t-shadow-sm)',
			},
		},
		consentDialogCard: {
			style: {
				border: '1px solid var(--c15t-border)',
				boxShadow: 'var(--c15t-shadow-lg)',
				width: 800,
			},
		},
	},
	typography: {
		fontFamily: 'system-ui, sans-serif',
		fontSize: { base: '0.875rem', lg: '1rem', sm: '0.8125rem' },
		fontWeight: { medium: 500, normal: 400, semibold: 500 },
		lineHeight: { normal: '1.5', relaxed: '1.7', tight: '1.3' },
	},
};

export const darkTheme: Theme = {
	colors: {
		border: '#333333',
		borderHover: '#444444',
		primary: '#ffffff',
		primaryHover: '#ededed',
		surface: '#000000',
		surfaceHover: '#111111',
		switchThumb: '#000000',
		switchTrack: '#333333',
		switchTrackActive: '#ffffff',
		text: '#ffffff',
		textMuted: '#888888',
		textOnPrimary: '#000000',
	},
	radius: { full: '9999px', lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
	shadows: {
		lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
		md: '0 4px 8px rgba(0, 0, 0, 0.5)',
		sm: '0 1px 2px rgba(255, 255, 255, 0.1)',
	},
	slots: {
		buttonPrimary: {
			style: {
				backgroundColor: '#ffffff',
				border: '1px solid #ffffff',
				boxShadow: 'none',
				color: '#000000',
				fontWeight: 500,
			},
		},
		buttonSecondary: {
			style: {
				backgroundColor: '#000000',
				border: '1px solid #333333',
				boxShadow: 'none',
				color: '#888888',
				fontWeight: 500,
			},
		},
		consentBannerCard: {
			style: {
				backgroundColor: '#000000',
				border: '1px solid #333333',
				boxShadow: 'none',
			},
		},
		consentDialogCard: {
			style: {
				backgroundColor: '#000000',
				border: '1px solid #333333',
				boxShadow: '0 0 0 1px #333333, 0 8px 40px rgba(0,0,0,0.5)',
			},
		},
	},
	typography: {
		fontFamily: 'system-ui, sans-serif',
		fontSize: { base: '0.875rem', lg: '1rem', sm: '0.8125rem' },
		fontWeight: { medium: 500, normal: 400, semibold: 600 },
	},
};

export const fullTheme: Theme = {
	colors: {
		border: '#e5e7eb',
		borderHover: '#d1d5db',
		primary: '#000000',
		primaryHover: '#333333',
		surface: '#ffffff',
		surfaceHover: '#f9fafb',
		switchThumb: '#ffffff',
		switchTrack: '#d1d5db',
		switchTrackActive: '#000000',
		text: '#111827',
		textMuted: '#6b7280',
		textOnPrimary: '#ffffff',
	},
	dark: {
		border: '#374151',
		borderHover: '#4b5563',
		primary: '#ffffff',
		primaryHover: '#e5e5e5',
		surface: '#000000',
		surfaceHover: '#1f2937',
		text: '#f9fafb',
		textMuted: '#9ca3af',
		textOnPrimary: '#000000',
	},
	radius: { full: '9999px', lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
	shadows: {
		lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
		md: '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
		sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
	},
	slots: {
		buttonPrimary: {
			style: {
				backgroundColor: 'var(--c15t-primary)',
				border: '1px solid transparent',
				borderRadius: '0.375rem',
				color: 'var(--c15t-text-on-primary)',
				cursor: 'pointer',
				fontSize: '0.875rem',
				fontWeight: 500,
				padding: '0.625rem 1.25rem',
				textAlign: 'center',
				whiteSpace: 'nowrap',
				width: '100%',
			},
		},
		buttonSecondary: {
			style: {
				backgroundColor: 'var(--c15t-surface)',
				border: '1px solid var(--c15t-border)',
				borderRadius: '0.375rem',
				color: 'var(--c15t-text)',
				cursor: 'pointer',
				fontSize: '0.875rem',
				fontWeight: 500,
				padding: '0.625rem 1.25rem',
				textAlign: 'center',
				whiteSpace: 'nowrap',
				width: '100%',
			},
		},
		consentBanner: {
			style: {
				bottom: '0',
				left: '0',
				margin: '0',
				maxWidth: '100%',
				padding: '0',
				position: 'fixed',
				right: '0',
				transform: 'none',
				width: '100%',
			},
		},
		consentBannerCard: {
			style: {
				alignItems: 'center',
				backgroundColor: 'var(--c15t-surface-hover)',
				borderBottom: 'none',
				borderLeft: 'none',
				borderRadius: '0',
				borderRight: 'none',
				borderTop: '1px solid var(--c15t-border)',
				boxShadow: '0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
				display: 'flex',
				flexDirection: 'row',
				gap: '2rem',
				justifyContent: 'space-between',
				maxWidth: '100%',
				padding: '1.5rem 2rem',
				width: '100%',
			},
		},
		consentBannerFooter: {
			style: {
				alignItems: 'stretch',
				borderLeft: '1px solid var(--c15t-border)',
				borderTop: 'none',
				display: 'flex',
				flexDirection: 'column',
				gap: '0.75rem',
				margin: '0',
				minWidth: '240px',
				width: 'auto',
			},
		},
		consentBannerFooterSubGroup: {
			style: {
				display: 'flex',
				flexDirection: 'column',
				gap: '0.75rem',
			},
		},
		consentBannerHeader: {
			style: {
				flex: '1',
				marginBottom: '0',
				maxWidth: '600px',
				textAlign: 'left',
			},
		},
		consentDialogCard: {
			style: {
				border: '1px solid var(--c15t-border)',
				borderRadius: '0.5rem',
				boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
			},
		},
	},
	typography: {
		fontFamily: 'system-ui, sans-serif',
		fontSize: { base: '1rem', lg: '1.125rem', sm: '0.875rem' },
		fontWeight: { medium: 500, normal: 400, semibold: 600 },
	},
};

export const tailwindTheme: Theme = {
	colors: {
		border: '#e2e8f0',
		borderHover: '#cbd5e1',
		primary: '#3b82f6',
		primaryHover: '#2563eb',
		surface: '#ffffff',
		surfaceHover: '#f8fafc',
		switchThumb: '#ffffff',
		switchTrack: '#e2e8f0',
		switchTrackActive: '#3b82f6',
		text: '#0f172a',
		textMuted: '#64748b',
		textOnPrimary: '#ffffff',
	},
	dark: {
		border: '#334155',
		borderHover: '#475569',
		primary: '#60a5fa',
		primaryHover: '#3b82f6',
		surface: '#0f172a',
		surfaceHover: '#1e293b',
		switchThumb: '#f8fafc',
		switchTrack: '#334155',
		switchTrackActive: '#60a5fa',
		text: '#f8fafc',
		textMuted: '#94a3b8',
		textOnPrimary: '#0f172a',
	},
	radius: { full: '9999px', lg: '0.5rem', md: '0.375rem', sm: '0.125rem' },
	slots: {
		buttonPrimary:
			'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 shadow-sm transition-colors',
		buttonSecondary:
			'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors',
		consentBannerCard:
			'border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-md',
		consentBannerDescription: 'text-slate-500 dark:text-slate-400',
		consentBannerTitle: 'text-slate-900 dark:text-slate-50 font-semibold',
		consentDialogCard:
			'border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl',
	},
	typography: {
		fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
	},
};

export const themePresets = {
	dark: darkTheme,
	full: fullTheme,
	minimal: minimalTheme,
	none: undefined,
	tailwind: tailwindTheme,
} as const;

export type ThemePresetName = keyof typeof themePresets;
