import type { Theme } from '@c15t/svelte';

export const minimalTheme: Theme = {
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
		fontFamily: 'system-ui, sans-serif',
		fontSize: { sm: '0.8125rem', base: '0.875rem', lg: '1rem' },
		fontWeight: { normal: 400, medium: 500, semibold: 500 },
		lineHeight: { tight: '1.3', normal: '1.5', relaxed: '1.7' },
	},
	radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', full: '9999px' },
	shadows: {
		sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
		md: '0 2px 8px rgba(0, 0, 0, 0.06)',
		lg: '0 4px 16px rgba(0, 0, 0, 0.08)',
	},
	slots: {
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
		buttonPrimary: {
			style: {
				borderRadius: 'var(--c15t-radius-sm)',
				boxShadow: 'none',
				fontWeight: 500,
			},
		},
		buttonSecondary: {
			style: {
				borderRadius: 'var(--c15t-radius-sm)',
				backgroundColor: 'transparent',
				border: '1px solid var(--c15t-border)',
				color: 'var(--c15t-text-muted)',
				boxShadow: 'none',
				fontWeight: 500,
			},
		},
	},
};

export const darkTheme: Theme = {
	colors: {
		primary: '#ffffff',
		primaryHover: '#ededed',
		surface: '#000000',
		surfaceHover: '#111111',
		border: '#333333',
		borderHover: '#444444',
		text: '#ffffff',
		textMuted: '#888888',
		textOnPrimary: '#000000',
		switchTrack: '#333333',
		switchTrackActive: '#ffffff',
		switchThumb: '#000000',
	},
	typography: {
		fontFamily: 'system-ui, sans-serif',
		fontSize: { sm: '0.8125rem', base: '0.875rem', lg: '1rem' },
		fontWeight: { normal: 400, medium: 500, semibold: 600 },
	},
	radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', full: '9999px' },
	shadows: {
		sm: '0 1px 2px rgba(255, 255, 255, 0.1)',
		md: '0 4px 8px rgba(0, 0, 0, 0.5)',
		lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
	},
	slots: {
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
		buttonPrimary: {
			style: {
				backgroundColor: '#ffffff',
				color: '#000000',
				border: '1px solid #ffffff',
				boxShadow: 'none',
				fontWeight: 500,
			},
		},
		buttonSecondary: {
			style: {
				backgroundColor: '#000000',
				border: '1px solid #333333',
				color: '#888888',
				boxShadow: 'none',
				fontWeight: 500,
			},
		},
	},
};

export const fullTheme: Theme = {
	colors: {
		primary: '#000000',
		primaryHover: '#333333',
		surface: '#ffffff',
		surfaceHover: '#f9fafb',
		border: '#e5e7eb',
		borderHover: '#d1d5db',
		text: '#111827',
		textMuted: '#6b7280',
		textOnPrimary: '#ffffff',
		switchTrack: '#d1d5db',
		switchTrackActive: '#000000',
		switchThumb: '#ffffff',
	},
	dark: {
		primary: '#ffffff',
		primaryHover: '#e5e5e5',
		surface: '#000000',
		surfaceHover: '#1f2937',
		border: '#374151',
		borderHover: '#4b5563',
		text: '#f9fafb',
		textMuted: '#9ca3af',
		textOnPrimary: '#000000',
	},
	typography: {
		fontFamily: 'system-ui, sans-serif',
		fontSize: { sm: '0.875rem', base: '1rem', lg: '1.125rem' },
		fontWeight: { normal: 400, medium: 500, semibold: 600 },
	},
	radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', full: '9999px' },
	shadows: {
		sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
		md: '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
		lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
	},
	slots: {
		consentBanner: {
			style: {
				position: 'fixed',
				bottom: '0',
				left: '0',
				right: '0',
				width: '100%',
				maxWidth: '100%',
				margin: '0',
				padding: '0',
				transform: 'none',
			},
		},
		consentBannerCard: {
			style: {
				width: '100%',
				maxWidth: '100%',
				borderRadius: '0',
				borderTop: '1px solid var(--c15t-border)',
				borderBottom: 'none',
				borderLeft: 'none',
				borderRight: 'none',
				backgroundColor: 'var(--c15t-surface-hover)',
				boxShadow: '0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
				padding: '1.5rem 2rem',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: '2rem',
			},
		},
		consentBannerHeader: {
			style: {
				marginBottom: '0',
				textAlign: 'left',
				flex: '1',
				maxWidth: '600px',
			},
		},
		consentBannerFooter: {
			style: {
				width: 'auto',
				margin: '0',
				display: 'flex',
				flexDirection: 'column',
				gap: '0.75rem',
				alignItems: 'stretch',
				minWidth: '240px',
				borderLeft: '1px solid var(--c15t-border)',
				borderTop: 'none',
			},
		},
		consentBannerFooterSubGroup: {
			style: {
				display: 'flex',
				flexDirection: 'column',
				gap: '0.75rem',
			},
		},
		consentDialogCard: {
			style: {
				borderRadius: '0.5rem',
				border: '1px solid var(--c15t-border)',
				boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
			},
		},
		buttonPrimary: {
			style: {
				borderRadius: '0.375rem',
				padding: '0.625rem 1.25rem',
				fontSize: '0.875rem',
				fontWeight: 500,
				backgroundColor: 'var(--c15t-primary)',
				color: 'var(--c15t-text-on-primary)',
				border: '1px solid transparent',
				cursor: 'pointer',
				whiteSpace: 'nowrap',
				width: '100%',
				textAlign: 'center',
			},
		},
		buttonSecondary: {
			style: {
				borderRadius: '0.375rem',
				padding: '0.625rem 1.25rem',
				fontSize: '0.875rem',
				fontWeight: 500,
				backgroundColor: 'var(--c15t-surface)',
				color: 'var(--c15t-text)',
				border: '1px solid var(--c15t-border)',
				cursor: 'pointer',
				whiteSpace: 'nowrap',
				width: '100%',
				textAlign: 'center',
			},
		},
	},
};

export const tailwindTheme: Theme = {
	colors: {
		primary: '#3b82f6',
		primaryHover: '#2563eb',
		surface: '#ffffff',
		surfaceHover: '#f8fafc',
		border: '#e2e8f0',
		borderHover: '#cbd5e1',
		text: '#0f172a',
		textMuted: '#64748b',
		textOnPrimary: '#ffffff',
		switchTrack: '#e2e8f0',
		switchTrackActive: '#3b82f6',
		switchThumb: '#ffffff',
	},
	dark: {
		primary: '#60a5fa',
		primaryHover: '#3b82f6',
		surface: '#0f172a',
		surfaceHover: '#1e293b',
		border: '#334155',
		borderHover: '#475569',
		text: '#f8fafc',
		textMuted: '#94a3b8',
		textOnPrimary: '#0f172a',
		switchTrack: '#334155',
		switchTrackActive: '#60a5fa',
		switchThumb: '#f8fafc',
	},
	typography: {
		fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
	},
	radius: { sm: '0.125rem', md: '0.375rem', lg: '0.5rem', full: '9999px' },
	slots: {
		consentBannerCard:
			'border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-md',
		consentDialogCard:
			'border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl',
		buttonPrimary:
			'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 shadow-sm transition-colors',
		buttonSecondary:
			'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors',
		consentBannerTitle: 'text-slate-900 dark:text-slate-50 font-semibold',
		consentBannerDescription: 'text-slate-500 dark:text-slate-400',
	},
};

export const themePresets = {
	minimal: minimalTheme,
	dark: darkTheme,
	full: fullTheme,
	tailwind: tailwindTheme,
	none: undefined,
} as const;

export type ThemePresetName = keyof typeof themePresets;
