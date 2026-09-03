<script lang="ts">
	import ForceBannerShow from '$lib/components/ForceBannerShow.svelte';
	import { minimalTheme, darkTheme } from '$lib/consent-manager/theme-presets';
	import { ConsentBanner, ConsentManagerProvider, offline } from '@c15t/svelte';
	import type { Theme } from '@c15t/svelte';

	type ButtonName = 'accept' | 'reject' | 'customize';
	type LayoutConfig = (ButtonName | ButtonName[])[];

	interface ShowcaseTheme {
		name: string;
		theme: Theme;
		description: string;
		layout?: LayoutConfig;
		primaryButton?: ButtonName[];
	}

	const showcaseThemes: ShowcaseTheme[] = [
		{ description: 'Clean baseline', name: 'Minimal', theme: minimalTheme },
		{ description: 'Dark mode', name: 'Dark', theme: darkTheme },
		{
			description: 'Sharp + uppercase',
			name: 'Square',
			theme: {
				colors: {
					border: '#d1d5db',
					borderHover: '#9ca3af',
					primary: '#1f2937',
					primaryHover: '#111827',
					surface: '#ffffff',
					surfaceHover: '#f9fafb',
					switchThumb: '#ffffff',
					switchTrack: '#d1d5db',
					switchTrackActive: '#1f2937',
					text: '#111827',
					textMuted: '#6b7280',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '0', lg: '0', md: '0', sm: '0' },
				slots: {
					consentBannerTitle: {
						style: {
							fontSize: '0.875rem',
							letterSpacing: '0.05em',
							textTransform: 'uppercase',
						},
					},
				},
			},
		},
		{
			description: 'Floating + large title',
			name: 'Floating',
			theme: {
				colors: {
					border: '#ede9fe',
					borderHover: '#ddd6fe',
					primary: '#7c3aed',
					primaryHover: '#6d28d9',
					surface: '#ffffff',
					surfaceHover: '#f5f3ff',
					switchThumb: '#ffffff',
					switchTrack: '#ddd6fe',
					switchTrackActive: '#7c3aed',
					text: '#4c1d95',
					textMuted: '#7c3aed',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '9999px', lg: '1rem', md: '0.75rem', sm: '0.5rem' },
				slots: {
					consentBannerCard: {
						style: {
							border: 'none',
							boxShadow: '0 20px 40px -12px rgba(124, 58, 237, 0.25)',
						},
					},
					consentBannerTitle: { style: { fontSize: '1.25rem' } },
				},
				typography: {
					fontSize: { base: '1rem', lg: '1.25rem', sm: '0.875rem' },
				},
			},
		},
		{
			description: 'Wide + customize first',
			layout: ['customize', ['reject', 'accept']],
			name: 'Brutalist',
			primaryButton: ['accept', 'reject'],
			theme: {
				colors: {
					border: '#000000',
					borderHover: '#262626',
					primary: '#000000',
					primaryHover: '#262626',
					surface: '#fafafa',
					surfaceHover: '#f5f5f5',
					switchThumb: '#ffffff',
					switchTrack: '#a3a3a3',
					switchTrackActive: '#000000',
					text: '#000000',
					textMuted: '#525252',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '0', lg: '0', md: '0', sm: '0' },
				slots: {
					buttonPrimary: {
						style: {
							border: '2px solid #000000',
							fontWeight: 700,
							letterSpacing: '0.05em',
							textTransform: 'uppercase',
						},
					},
					buttonSecondary: {
						style: {
							border: '2px solid #000000',
							fontWeight: 700,
							letterSpacing: '0.05em',
							textTransform: 'uppercase',
						},
					},
					consentBanner: { style: { maxWidth: '520px' } },
					consentBannerCard: { style: { border: '3px solid #000000' } },
					consentBannerTitle: {
						style: {
							fontWeight: 900,
							letterSpacing: '0.1em',
							textTransform: 'uppercase',
						},
					},
				},
				typography: { fontWeight: { medium: 700, normal: 500, semibold: 900 } },
			},
		},
		{
			description: 'All buttons primary',
			name: 'Soft',
			primaryButton: ['accept', 'reject', 'customize'],
			theme: {
				colors: {
					border: '#fbcfe8',
					borderHover: '#f9a8d4',
					primary: '#f472b6',
					primaryHover: '#ec4899',
					surface: '#fdf2f8',
					surfaceHover: '#fce7f3',
					switchThumb: '#ffffff',
					switchTrack: '#fbcfe8',
					switchTrackActive: '#f472b6',
					text: '#831843',
					textMuted: '#be185d',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '9999px', lg: '1.5rem', md: '1.25rem', sm: '1rem' },
				slots: {
					buttonPrimary: { style: { borderRadius: '1rem' } },
					buttonSecondary: { style: { borderRadius: '1rem' } },
					consentBannerCard: { style: { borderRadius: '1.5rem' } },
					consentBannerTitle: { style: { fontWeight: 500 } },
				},
				typography: {
					fontFamily: 'system-ui, sans-serif',
					fontWeight: { medium: 500, normal: 400, semibold: 500 },
				},
			},
		},
		{
			description: 'Smaller compact',
			name: 'Compact',
			theme: {
				colors: {
					border: '#dbeafe',
					borderHover: '#bfdbfe',
					primary: '#1d4ed8',
					primaryHover: '#1e40af',
					surface: '#ffffff',
					surfaceHover: '#eff6ff',
					switchThumb: '#ffffff',
					switchTrack: '#bfdbfe',
					switchTrackActive: '#1d4ed8',
					text: '#1e3a8a',
					textMuted: '#3b82f6',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '9999px', lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
				slots: {
					buttonPrimary: {
						style: { fontSize: '0.75rem', padding: '0.375rem 0.625rem' },
					},
					buttonSecondary: {
						style: { fontSize: '0.75rem', padding: '0.375rem 0.625rem' },
					},
					consentBannerFooter: {
						style: { gap: '0.5rem', paddingTop: '0.75rem' },
					},
					consentBannerHeader: { style: { marginBottom: '0.5rem' } },
				},
				typography: {
					fontSize: { base: '0.8125rem', lg: '0.875rem', sm: '0.75rem' },
				},
			},
		},
		{
			description: 'Inner shadow effect',
			name: 'Inset',
			theme: {
				colors: {
					border: '#a7f3d0',
					borderHover: '#6ee7b7',
					primary: '#059669',
					primaryHover: '#047857',
					surface: '#ecfdf5',
					surfaceHover: '#d1fae5',
					switchThumb: '#ffffff',
					switchTrack: '#a7f3d0',
					switchTrackActive: '#059669',
					text: '#064e3b',
					textMuted: '#047857',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '9999px', lg: '0.75rem', md: '0.5rem', sm: '0.375rem' },
				slots: {
					buttonSecondary: {
						style: { boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.08)' },
					},
					consentBannerCard: {
						style: { boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)' },
					},
				},
			},
		},
		{
			description: 'Vertical stacked buttons',
			name: 'Mono',
			theme: {
				colors: {
					border: '#d4d4d4',
					borderHover: '#a3a3a3',
					primary: '#525252',
					primaryHover: '#404040',
					surface: '#fafafa',
					surfaceHover: '#f5f5f5',
					switchThumb: '#ffffff',
					switchTrack: '#d4d4d4',
					switchTrackActive: '#525252',
					text: '#171717',
					textMuted: '#737373',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '9999px', lg: '0.75rem', md: '0.5rem', sm: '0.375rem' },
				slots: {
					buttonPrimary: { style: { justifyContent: 'center', width: '100%' } },
					buttonSecondary: {
						style: { justifyContent: 'center', width: '100%' },
					},
					consentBannerFooter: {
						style: { alignItems: 'stretch', flexDirection: 'column' },
					},
					consentBannerFooterSubGroup: {
						style: { flexDirection: 'column', width: '100%' },
					},
				},
			},
		},
		{
			description: 'Cool ocean blues',
			name: 'Ocean',
			theme: {
				colors: {
					border: '#bae6fd',
					borderHover: '#7dd3fc',
					primary: '#0284c7',
					primaryHover: '#0369a1',
					surface: '#f0f9ff',
					surfaceHover: '#e0f2fe',
					switchThumb: '#ffffff',
					switchTrack: '#bae6fd',
					switchTrackActive: '#0284c7',
					text: '#0c4a6e',
					textMuted: '#0369a1',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '9999px', lg: '0.75rem', md: '0.5rem', sm: '0.375rem' },
			},
		},
		{
			description: 'Accept first',
			layout: [['accept', 'reject'], 'customize'],
			name: 'Forest',
			theme: {
				colors: {
					border: '#bbf7d0',
					borderHover: '#86efac',
					primary: '#16a34a',
					primaryHover: '#15803d',
					surface: '#f0fdf4',
					surfaceHover: '#dcfce7',
					switchThumb: '#ffffff',
					switchTrack: '#bbf7d0',
					switchTrackActive: '#16a34a',
					text: '#14532d',
					textMuted: '#166534',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '9999px', lg: '0.75rem', md: '0.5rem', sm: '0.375rem' },
			},
		},
		{
			description: 'Soft purples',
			name: 'Lavender',
			theme: {
				colors: {
					border: '#ddd6fe',
					borderHover: '#c4b5fd',
					primary: '#7c3aed',
					primaryHover: '#6d28d9',
					surface: '#f5f3ff',
					surfaceHover: '#ede9fe',
					switchThumb: '#ffffff',
					switchTrack: '#ddd6fe',
					switchTrackActive: '#7c3aed',
					text: '#4c1d95',
					textMuted: '#6d28d9',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '9999px', lg: '1rem', md: '0.75rem', sm: '0.5rem' },
			},
		},
		{
			description: 'Deep dark indigo',
			name: 'Midnight',
			theme: {
				colors: {
					border: '#3730a3',
					borderHover: '#4338ca',
					primary: '#818cf8',
					primaryHover: '#6366f1',
					surface: '#1e1b4b',
					surfaceHover: '#312e81',
					switchThumb: '#1e1b4b',
					switchTrack: '#3730a3',
					switchTrackActive: '#818cf8',
					text: '#e0e7ff',
					textMuted: '#a5b4fc',
					textOnPrimary: '#1e1b4b',
				},
				radius: { full: '9999px', lg: '0.75rem', md: '0.5rem', sm: '0.375rem' },
			},
		},
		{
			description: 'Warm oranges',
			name: 'Sunset',
			theme: {
				colors: {
					border: '#fed7aa',
					borderHover: '#fdba74',
					primary: '#ea580c',
					primaryHover: '#c2410c',
					surface: '#fff7ed',
					surfaceHover: '#ffedd5',
					switchThumb: '#ffffff',
					switchTrack: '#fed7aa',
					switchTrackActive: '#ea580c',
					text: '#7c2d12',
					textMuted: '#c2410c',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '9999px', lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
			},
		},
		{
			description: 'Vintage style',
			name: 'Retro',
			theme: {
				colors: {
					border: '#d97706',
					borderHover: '#b45309',
					primary: '#b45309',
					primaryHover: '#92400e',
					surface: '#fef3e2',
					surfaceHover: '#fde9cc',
					switchThumb: '#ffffff',
					switchTrack: '#fcd34d',
					switchTrackActive: '#b45309',
					text: '#78350f',
					textMuted: '#a16207',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '9999px', lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
				slots: {
					consentBannerCard: { style: { border: '2px solid #b45309' } },
				},
				typography: { fontFamily: 'system-ui, sans-serif' },
			},
		},
		{
			description: 'Playful offset shadows',
			name: 'Cartoon',
			theme: {
				colors: {
					border: '#1f2937',
					borderHover: '#111827',
					primary: '#0d9488',
					primaryHover: '#0f766e',
					surface: '#fef3c7',
					surfaceHover: '#fde68a',
					switchThumb: '#ffffff',
					switchTrack: '#d1d5db',
					switchTrackActive: '#0d9488',
					text: '#1f2937',
					textMuted: '#4b5563',
					textOnPrimary: '#ffffff',
				},
				radius: { full: '9999px', lg: '1rem', md: '0.75rem', sm: '0.5rem' },
				slots: {
					buttonPrimary: {
						style: {
							border: '2px solid #1f2937',
							boxShadow: '3px 3px 0 #1f2937',
						},
					},
					buttonSecondary: {
						style: {
							backgroundColor: '#ffffff',
							border: '2px solid #1f2937',
							boxShadow: '3px 3px 0 #1f2937',
						},
					},
					consentBannerCard: {
						style: {
							border: '3px solid #1f2937',
							boxShadow: '6px 6px 0 #1f2937',
						},
					},
				},
				typography: {
					fontFamily: 'system-ui, sans-serif',
					fontWeight: { medium: 600, normal: 500, semibold: 700 },
				},
			},
		},
	];

	const centeredBannerTheme = function centeredBannerTheme(
		baseTheme: Theme
	): Theme {
		const baseSlots = baseTheme.slots || {};
		const baseBanner =
			typeof baseSlots.consentBanner === 'object'
				? baseSlots.consentBanner
				: {};
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
						bottom: 'auto',
						left: '50%',
						margin: '0',
						maxWidth: '420px',
						position: 'fixed',
						right: 'auto',
						top: '50%',
						transform: 'translate(-50%, -50%)',
						width: '100%',
						...baseBannerStyle,
					},
				},
				consentBannerCard: {
					style: { ...baseBannerCardStyle },
				},
				consentBannerOverlay: {
					style: { display: 'none' },
				},
			},
		};
	};

	let currentIndex = $state(0);
	let isPlaying = $state(true);
	let key = $state(0);

	const currentThemeData = $derived(showcaseThemes[currentIndex]);
	const activeTheme = $derived(centeredBannerTheme(currentThemeData.theme));

	const goToNext = function goToNext() {
		currentIndex = (currentIndex + 1) % showcaseThemes.length;
		key += 1;
	};

	const goToPrevious = function goToPrevious() {
		currentIndex =
			(currentIndex - 1 + showcaseThemes.length) % showcaseThemes.length;
		key += 1;
	};

	const goToIndex = function goToIndex(index: number) {
		currentIndex = index;
		key += 1;
	};

	$effect(() => {
		if (!isPlaying) {
			return;
		}
		const interval = setInterval(goToNext, 400);
		return () => clearInterval(interval);
	});
</script>

<div class="flex min-h-screen flex-col">
	<header class="p-8 text-center">
		<h1 class="text-foreground mb-2 text-4xl font-bold">Theme Showcase</h1>
		<p class="text-muted-foreground">
			Demonstrating c15t's customizable theme engine
		</p>
	</header>

	<div class="flex-1"></div>

	<div class="pointer-events-none fixed top-32 right-0 left-0 z-10 text-center">
		<h2 class="text-foreground text-2xl font-semibold">
			{currentThemeData.name}
		</h2>
		<p class="text-muted-foreground mt-1 text-sm">
			{currentThemeData.description}
		</p>
	</div>

	{#key key}
		<ConsentManagerProvider
			options={{
				mode: offline(),
				consentCategories: ['necessary', 'marketing', 'measurement'],
				theme: activeTheme,
			}}
		>
			<ForceBannerShow />
			<ConsentBanner
				layout={currentThemeData.layout ?? [['reject', 'accept'], 'customize']}
				primaryButton={currentThemeData.primaryButton ?? ['customize']}
			/>
		</ConsentManagerProvider>
	{/key}

	<footer
		class="from-background fixed right-0 bottom-0 left-0 flex flex-col items-center gap-4 bg-gradient-to-t to-transparent p-8"
	>
		<div class="flex items-center gap-4">
			<button
				type="button"
				onclick={goToPrevious}
				class="bg-secondary hover:bg-secondary/80 rounded-full p-2 transition-colors"
				aria-label="Previous theme"
			>
				<svg
					class="h-5 w-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</button>

			<button
				type="button"
				onclick={() => (isPlaying = !isPlaying)}
				class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 transition-colors"
			>
				{isPlaying ? 'Pause' : 'Play'}
			</button>

			<button
				type="button"
				onclick={goToNext}
				class="bg-secondary hover:bg-secondary/80 rounded-full p-2 transition-colors"
				aria-label="Next theme"
			>
				<svg
					class="h-5 w-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5l7 7-7 7"
					/>
				</svg>
			</button>
		</div>

		<div class="flex gap-2">
			{#each showcaseThemes as theme, index}
				<button
					type="button"
					onclick={() => goToIndex(index)}
					class="h-3 w-3 rounded-full transition-all {index === currentIndex
						? 'bg-primary scale-125'
						: 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}"
					aria-label="Go to {theme.name} theme"
				></button>
			{/each}
		</div>

		<div class="text-muted-foreground text-sm">
			{currentIndex + 1} / {showcaseThemes.length}
		</div>
	</footer>
</div>
