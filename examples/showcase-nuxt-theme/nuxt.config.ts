export default defineNuxtConfig({
	c15t: {
		backendURL:
			process.env.NUXT_PUBLIC_C15T_BACKEND_URL ??
			'https://benchmarks-inth.inth.app',
		// The banner and dialog link to the shop's privacy policy. The label
		// comes from the project's translations.
		bannerLegalLinks: ['privacyPolicy'],
		buildManifest: true,
		// `theme.dark` applies while the visitor's system is in dark mode.
		colorScheme: 'system',
		// Classes on single parts of the stock banner and dialog. The rules
		// for them are in app/assets/consent.css.
		components: {
			banner: {
				card: { class: 'nw-consent-card' },
				title: { class: 'nw-consent-title' },
			},
			dialog: {
				card: { class: 'nw-consent-card' },
				title: { class: 'nw-consent-title' },
			},
		},
		dialogLegalLinks: ['privacyPolicy'],
		legalLinks: { privacyPolicy: { href: '/privacy' } },
		// A wall: the banner sits in the middle of the page and blocks it
		// until the visitor chooses. A notice can't block, so where the
		// policy only shows a notice, c15t uses the floating card instead.
		presentation: { prompt: { position: 'center', variant: 'wall' } },
		// Northwind's colors and corners, in light and dark.
		theme: {
			colors: {
				border: '#e4dccf',
				primary: '#2f6f4e',
				primaryHover: '#24563c',
				surface: '#fbf8f3',
				text: '#1f2328',
				textMuted: '#5b6168',
				textOnPrimary: '#ffffff',
			},
			dark: {
				border: '#34403a',
				primary: '#7fd1a8',
				primaryHover: '#9fdcbb',
				surface: '#1a1f1c',
				text: '#f1ede6',
				textMuted: '#a9b1aa',
				textOnPrimary: '#10231a',
			},
			radius: { lg: '6px', md: '4px', sm: '3px' },
		},
	},
	compatibilityDate: '2026-07-04',
	css: ['~/assets/site.css', '~/assets/consent.css'],
	modules: ['c15t/vue'],
});
