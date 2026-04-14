'use client';

import {
	ConsentBanner,
	ConsentManagerProvider,
	policyPackPresets,
	type Theme,
	useConsentManager,
} from '@c15t/react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
	darkTheme,
	minimalTheme,
} from '../../../components/consent-manager/theme-presets';

type ButtonName = 'accept' | 'reject' | 'customize';
type LayoutConfig = (ButtonName | ButtonName[])[];

interface ShowcaseTheme {
	name: string;
	theme: Theme;
	description: string;
	layout?: LayoutConfig;
	primaryButton?: ButtonName[];
}

/**
 * Extended theme presets with additional showcase themes
 */
const showcaseThemes: ShowcaseTheme[] = [
	// 1. Minimal - baseline
	{
		name: 'Minimal',
		theme: minimalTheme,
		description: 'Clean baseline',
	},
	// 2. Dark - dark mode
	{
		name: 'Dark',
		theme: darkTheme,
		description: 'Dark mode',
	},
	// 3. Square - zero radius, uppercase
	{
		name: 'Square',
		theme: {
			colors: {
				primary: '#1f2937',
				primaryHover: '#111827',
				surface: '#ffffff',
				surfaceHover: '#f9fafb',
				border: '#d1d5db',
				borderHover: '#9ca3af',
				text: '#111827',
				textMuted: '#6b7280',
				textOnPrimary: '#ffffff',
				switchTrack: '#d1d5db',
				switchTrackActive: '#1f2937',
				switchThumb: '#ffffff',
			},
			radius: { sm: '0', md: '0', lg: '0', full: '0' },
			slots: {
				consentBannerTitle: {
					style: {
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
						fontSize: '0.875rem',
					},
				},
			},
		},
		description: 'Sharp + uppercase',
	},
	// 4. Floating - elevated, larger title
	{
		name: 'Floating',
		theme: {
			colors: {
				primary: '#7c3aed',
				primaryHover: '#6d28d9',
				surface: '#ffffff',
				surfaceHover: '#f5f3ff',
				border: '#ede9fe',
				borderHover: '#ddd6fe',
				text: '#4c1d95',
				textMuted: '#7c3aed',
				textOnPrimary: '#ffffff',
				switchTrack: '#ddd6fe',
				switchTrackActive: '#7c3aed',
				switchThumb: '#ffffff',
			},
			typography: { fontSize: { sm: '0.875rem', base: '1rem', lg: '1.25rem' } },
			radius: { sm: '0.5rem', md: '0.75rem', lg: '1rem', full: '9999px' },
			slots: {
				consentBannerCard: {
					style: {
						boxShadow: '0 20px 40px -12px rgba(124, 58, 237, 0.25)',
						border: 'none',
					},
				},
				consentBannerTitle: { style: { fontSize: '1.25rem' } },
			},
		},
		description: 'Floating + large title',
	},
	// 5. Brutalist - raw, harsh, uppercase, customize first, wider
	{
		name: 'Brutalist',
		theme: {
			colors: {
				primary: '#000000',
				primaryHover: '#262626',
				surface: '#fafafa',
				surfaceHover: '#f5f5f5',
				border: '#000000',
				borderHover: '#262626',
				text: '#000000',
				textMuted: '#525252',
				textOnPrimary: '#ffffff',
				switchTrack: '#a3a3a3',
				switchTrackActive: '#000000',
				switchThumb: '#ffffff',
			},
			radius: { sm: '0', md: '0', lg: '0', full: '0' },
			typography: { fontWeight: { normal: 500, medium: 700, semibold: 900 } },
			slots: {
				consentBanner: { style: { maxWidth: '520px' } },
				consentBannerCard: { style: { border: '3px solid #000000' } },
				consentBannerTitle: {
					style: {
						textTransform: 'uppercase',
						letterSpacing: '0.1em',
						fontWeight: 900,
					},
				},
				buttonPrimary: {
					style: {
						border: '2px solid #000000',
						fontWeight: 700,
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
					},
				},
				buttonSecondary: {
					style: {
						border: '2px solid #000000',
						fontWeight: 700,
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
					},
				},
			},
		},
		layout: ['customize', ['reject', 'accept']],
		primaryButton: ['accept', 'reject'],
		description: 'Wide + customize first',
	},
	// 10. Soft - rounded, all buttons primary
	{
		name: 'Soft',
		theme: {
			colors: {
				primary: '#f472b6',
				primaryHover: '#ec4899',
				surface: '#fdf2f8',
				surfaceHover: '#fce7f3',
				border: '#fbcfe8',
				borderHover: '#f9a8d4',
				text: '#831843',
				textMuted: '#be185d',
				textOnPrimary: '#ffffff',
				switchTrack: '#fbcfe8',
				switchTrackActive: '#f472b6',
				switchThumb: '#ffffff',
			},
			typography: {
				fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
				fontWeight: { normal: 400, medium: 500, semibold: 500 },
			},
			radius: { sm: '1rem', md: '1.25rem', lg: '1.5rem', full: '9999px' },
			slots: {
				consentBannerCard: { style: { borderRadius: '1.5rem' } },
				consentBannerTitle: { style: { fontWeight: 500 } },
				buttonPrimary: { style: { borderRadius: '1rem' } },
				buttonSecondary: { style: { borderRadius: '1rem' } },
			},
		},
		primaryButton: ['accept', 'reject', 'customize'],
		description: 'All buttons primary',
	},
	// 11. Compact - small tight layout
	{
		name: 'Compact',
		theme: {
			colors: {
				primary: '#1d4ed8',
				primaryHover: '#1e40af',
				surface: '#ffffff',
				surfaceHover: '#eff6ff',
				border: '#dbeafe',
				borderHover: '#bfdbfe',
				text: '#1e3a8a',
				textMuted: '#3b82f6',
				textOnPrimary: '#ffffff',
				switchTrack: '#bfdbfe',
				switchTrackActive: '#1d4ed8',
				switchThumb: '#ffffff',
			},
			radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', full: '9999px' },
			typography: {
				fontSize: { sm: '0.75rem', base: '0.8125rem', lg: '0.875rem' },
			},
			slots: {
				consentBannerHeader: { style: { marginBottom: '0.5rem' } },
				consentBannerFooter: {
					style: { paddingTop: '0.75rem', gap: '0.5rem' },
				},
				buttonPrimary: {
					style: { padding: '0.375rem 0.625rem', fontSize: '0.75rem' },
				},
				buttonSecondary: {
					style: { padding: '0.375rem 0.625rem', fontSize: '0.75rem' },
				},
			},
		},
		description: 'Smaller compact',
	},
	// 12. Inset - inner shadow
	{
		name: 'Inset',
		theme: {
			colors: {
				primary: '#059669',
				primaryHover: '#047857',
				surface: '#ecfdf5',
				surfaceHover: '#d1fae5',
				border: '#a7f3d0',
				borderHover: '#6ee7b7',
				text: '#064e3b',
				textMuted: '#047857',
				textOnPrimary: '#ffffff',
				switchTrack: '#a7f3d0',
				switchTrackActive: '#059669',
				switchThumb: '#ffffff',
			},
			radius: { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', full: '9999px' },
			slots: {
				consentBannerCard: {
					style: { boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)' },
				},
				buttonSecondary: {
					style: { boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.08)' },
				},
			},
		},
		description: 'Inner shadow effect',
	},
	// 13. Mono - vertical stacked buttons
	{
		name: 'Mono',
		theme: {
			colors: {
				primary: '#525252',
				primaryHover: '#404040',
				surface: '#fafafa',
				surfaceHover: '#f5f5f5',
				border: '#d4d4d4',
				borderHover: '#a3a3a3',
				text: '#171717',
				textMuted: '#737373',
				textOnPrimary: '#ffffff',
				switchTrack: '#d4d4d4',
				switchTrackActive: '#525252',
				switchThumb: '#ffffff',
			},
			radius: { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', full: '9999px' },
			slots: {
				consentBannerFooter: {
					style: { flexDirection: 'column', alignItems: 'stretch' },
				},
				consentBannerFooterSubGroup: {
					style: { flexDirection: 'column', width: '100%' },
				},
				buttonPrimary: { style: { width: '100%', justifyContent: 'center' } },
				buttonSecondary: { style: { width: '100%', justifyContent: 'center' } },
			},
		},
		description: 'Vertical stacked buttons',
	},
	// 14. Ocean - blue tones
	{
		name: 'Ocean',
		theme: {
			colors: {
				primary: '#0284c7',
				primaryHover: '#0369a1',
				surface: '#f0f9ff',
				surfaceHover: '#e0f2fe',
				border: '#bae6fd',
				borderHover: '#7dd3fc',
				text: '#0c4a6e',
				textMuted: '#0369a1',
				textOnPrimary: '#ffffff',
				switchTrack: '#bae6fd',
				switchTrackActive: '#0284c7',
				switchThumb: '#ffffff',
			},
			radius: { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', full: '9999px' },
		},
		description: 'Cool ocean blues',
	},
	// 15. Forest - greens, accept first
	{
		name: 'Forest',
		theme: {
			colors: {
				primary: '#16a34a',
				primaryHover: '#15803d',
				surface: '#f0fdf4',
				surfaceHover: '#dcfce7',
				border: '#bbf7d0',
				borderHover: '#86efac',
				text: '#14532d',
				textMuted: '#166534',
				textOnPrimary: '#ffffff',
				switchTrack: '#bbf7d0',
				switchTrackActive: '#16a34a',
				switchThumb: '#ffffff',
			},
			radius: { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', full: '9999px' },
		},
		layout: [['accept', 'reject'], 'customize'],
		description: 'Accept first',
	},
	// 16. Lavender
	{
		name: 'Lavender',
		theme: {
			colors: {
				primary: '#7c3aed',
				primaryHover: '#6d28d9',
				surface: '#f5f3ff',
				surfaceHover: '#ede9fe',
				border: '#ddd6fe',
				borderHover: '#c4b5fd',
				text: '#4c1d95',
				textMuted: '#6d28d9',
				textOnPrimary: '#ffffff',
				switchTrack: '#ddd6fe',
				switchTrackActive: '#7c3aed',
				switchThumb: '#ffffff',
			},
			radius: { sm: '0.5rem', md: '0.75rem', lg: '1rem', full: '9999px' },
		},
		description: 'Soft purples',
	},
	// 17. Midnight - dark indigo
	{
		name: 'Midnight',
		theme: {
			colors: {
				primary: '#818cf8',
				primaryHover: '#6366f1',
				surface: '#1e1b4b',
				surfaceHover: '#312e81',
				border: '#3730a3',
				borderHover: '#4338ca',
				text: '#e0e7ff',
				textMuted: '#a5b4fc',
				textOnPrimary: '#1e1b4b',
				switchTrack: '#3730a3',
				switchTrackActive: '#818cf8',
				switchThumb: '#1e1b4b',
			},
			radius: { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', full: '9999px' },
		},
		description: 'Deep dark indigo',
	},
	// 18. Sunset - warm orange
	{
		name: 'Sunset',
		theme: {
			colors: {
				primary: '#ea580c',
				primaryHover: '#c2410c',
				surface: '#fff7ed',
				surfaceHover: '#ffedd5',
				border: '#fed7aa',
				borderHover: '#fdba74',
				text: '#7c2d12',
				textMuted: '#c2410c',
				textOnPrimary: '#ffffff',
				switchTrack: '#fed7aa',
				switchTrackActive: '#ea580c',
				switchThumb: '#ffffff',
			},
			radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', full: '9999px' },
		},
		description: 'Warm oranges',
	},
	// 19. Retro - vintage
	{
		name: 'Retro',
		theme: {
			colors: {
				primary: '#b45309',
				primaryHover: '#92400e',
				surface: '#fef3e2',
				surfaceHover: '#fde9cc',
				border: '#d97706',
				borderHover: '#b45309',
				text: '#78350f',
				textMuted: '#a16207',
				textOnPrimary: '#ffffff',
				switchTrack: '#fcd34d',
				switchTrackActive: '#b45309',
				switchThumb: '#ffffff',
			},
			typography: { fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' },
			radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', full: '9999px' },
			slots: {
				consentBannerCard: { style: { border: '2px solid #b45309' } },
			},
		},
		description: 'Vintage style',
	},
	// 20. Cartoon - offset shadows
	{
		name: 'Cartoon',
		theme: {
			colors: {
				primary: '#0d9488',
				primaryHover: '#0f766e',
				surface: '#fef3c7',
				surfaceHover: '#fde68a',
				border: '#1f2937',
				borderHover: '#111827',
				text: '#1f2937',
				textMuted: '#4b5563',
				textOnPrimary: '#ffffff',
				switchTrack: '#d1d5db',
				switchTrackActive: '#0d9488',
				switchThumb: '#ffffff',
			},
			typography: {
				fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
				fontWeight: { normal: 500, medium: 600, semibold: 700 },
			},
			radius: { sm: '0.5rem', md: '0.75rem', lg: '1rem', full: '9999px' },
			slots: {
				consentBannerCard: {
					style: {
						border: '3px solid #1f2937',
						boxShadow: '6px 6px 0 #1f2937',
					},
				},
				buttonPrimary: {
					style: {
						border: '2px solid #1f2937',
						boxShadow: '3px 3px 0 #1f2937',
					},
				},
				buttonSecondary: {
					style: {
						border: '2px solid #1f2937',
						boxShadow: '3px 3px 0 #1f2937',
						backgroundColor: '#ffffff',
					},
				},
			},
		},
		description: 'Playful offset shadows',
	},
];

/**
 * Centered banner wrapper that overrides the default positioning
 * Since the banner is portaled to document.body, we center it in the viewport
 */
const centeredBannerTheme = (baseTheme: Theme): Theme => {
	const baseSlots = baseTheme.slots || {};
	const baseBanner =
		typeof baseSlots.consentBanner === 'object' ? baseSlots.consentBanner : {};
	const baseBannerStyle = 'style' in baseBanner ? baseBanner.style : {};
	const baseBannerCard =
		typeof baseSlots.consentBannerCard === 'object'
			? baseSlots.consentBannerCard
			: {};
	const baseBannerCardStyle =
		'style' in baseBannerCard ? baseBannerCard.style : {};

	return {
		...baseTheme,
		slots: {
			...baseSlots,
			consentBanner: {
				style: {
					position: 'fixed',
					top: '50%',
					left: '50%',
					bottom: 'auto',
					right: 'auto',
					transform: 'translate(-50%, -50%)',
					margin: '0',
					width: '100%',
					maxWidth: '420px',
					...baseBannerStyle,
				},
			},
			consentBannerCard: {
				style: {
					...baseBannerCardStyle,
				},
			},
			consentBannerOverlay: {
				style: {
					display: 'none',
				},
			},
		},
	};
};

export default function ThemeShowcasePage() {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(true);
	const [key, setKey] = useState(0);

	const currentThemeData = showcaseThemes[currentIndex];
	const activeTheme = centeredBannerTheme(currentThemeData.theme);

	const goToNext = useCallback(() => {
		setCurrentIndex((prev) => (prev + 1) % showcaseThemes.length);
		setKey((prev) => prev + 1);
	}, []);

	const goToPrevious = useCallback(() => {
		setCurrentIndex(
			(prev) => (prev - 1 + showcaseThemes.length) % showcaseThemes.length
		);
		setKey((prev) => prev + 1);
	}, []);

	const goToIndex = useCallback((index: number) => {
		setCurrentIndex(index);
		setKey((prev) => prev + 1);
	}, []);

	useEffect(() => {
		if (!isPlaying) {
			return;
		}
		const interval = setInterval(goToNext, 400);
		return () => clearInterval(interval);
	}, [isPlaying, goToNext]);

	return (
		<div className="min-h-screen flex flex-col">
			{/* Header */}
			<header className="p-8 text-center">
				<h1 className="text-4xl font-bold mb-2 text-foreground">
					Theme Showcase
				</h1>
				<p className="text-muted-foreground">
					Demonstrating c15t&apos;s customizable theme engine
				</p>
				<div className="mt-4 flex justify-center">
					<Link
						href="/theme/regressions"
						className="inline-flex items-center rounded-full border border-border bg-background/85 px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
					>
						Open Regression Checks
					</Link>
				</div>
				<p className="mt-3 text-sm text-muted-foreground">
					Regression previews live on a dedicated page so they don&apos;t
					compete with the portaled rotating banner demo.
				</p>
			</header>

			<section className="relative flex min-h-[calc(100vh-10rem)] flex-1 items-center justify-center pb-32">
				{/* Current theme info - positioned above the banner */}
				<div className="absolute top-12 left-0 right-0 text-center pointer-events-none z-10">
					<h2 className="text-2xl font-semibold text-foreground">
						{currentThemeData.name}
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						{currentThemeData.description}
					</p>
				</div>

				{/* Banner is rendered via portal, centered in viewport by theme */}
				<ConsentManagerProvider
					key={key}
					options={{
						mode: 'offline',
						consentCategories: ['necessary', 'marketing', 'measurement'],
						theme: activeTheme,
						offlinePolicy: {
							policyPacks: [
								policyPackPresets.europeOptIn(),
								policyPackPresets.californiaOptOut(),
								policyPackPresets.worldNoBanner(),
							],
						},
					}}
				>
					<ForceBannerShow />
					<BannerDisplay
						layout={currentThemeData.layout}
						primaryButton={currentThemeData.primaryButton}
					/>
				</ConsentManagerProvider>

				{/* Controls */}
				<footer className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-4 bg-linear-to-t from-background to-transparent">
					{/* Navigation controls */}
					<div className="flex items-center gap-4">
						<button
							type="button"
							onClick={goToPrevious}
							className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
							aria-label="Previous theme"
						>
							<svg
								className="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 19l-7-7 7-7"
								/>
							</svg>
						</button>

						<button
							type="button"
							onClick={() => setIsPlaying(!isPlaying)}
							className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
						>
							{isPlaying ? 'Pause' : 'Play'}
						</button>

						<button
							type="button"
							onClick={goToNext}
							className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
							aria-label="Next theme"
						>
							<svg
								className="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</button>
					</div>

					{/* Theme dots */}
					<div className="flex gap-2">
						{showcaseThemes.map((theme, index) => (
							<button
								key={theme.name}
								type="button"
								onClick={() => goToIndex(index)}
								className={`w-3 h-3 rounded-full transition-all ${
									index === currentIndex
										? 'bg-primary scale-125'
										: 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
								}`}
								aria-label={`Go to ${theme.name} theme`}
							/>
						))}
					</div>

					{/* Theme counter */}
					<div className="text-sm text-muted-foreground">
						{currentIndex + 1} / {showcaseThemes.length}
					</div>
				</footer>
			</section>
		</div>
	);
}

/**
 * Component that forces the banner to show on mount
 */
function ForceBannerShow() {
	const { setActiveUI } = useConsentManager();

	useEffect(() => {
		// Force the banner to show
		setActiveUI('banner', { force: true });
	}, [setActiveUI]);

	return null;
}

/**
 * Banner display component that shows the banner
 */
function BannerDisplay({
	layout = [['reject', 'accept'], 'customize'],
	primaryButton = ['customize'],
}: {
	layout?: LayoutConfig;
	primaryButton?: ButtonName[];
}) {
	return (
		<ConsentBanner
			layout={layout}
			primaryButton={primaryButton}
			legalLinks={['privacyPolicy', 'termsOfService']}
		/>
	);
}
