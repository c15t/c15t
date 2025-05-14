// c15t Client Configuration
import type { ConsentManagerOptions } from '@c15t/nextjs';

export const c15tConfig = {
	// Using hosted c15t (consent.io) or self-hosted instance
	mode: 'c15t',
	backendURL: 'http://localhost:8787/',
	store: {
		initialGdprTypes: ['necessary', 'marketing'],
	},
	translations: {
		translations: {
			de: {
				cookieBanner: {
					title: 'HALLLOOO',
					description:
						'Diese Website verwendet Cookies, um Ihre Surf-Erfahrung zu verbessern, den Seitenverkehr zu analysieren und persönliche Inhalte anzuzeigen.',
				},
			},
		},
	},
} satisfies ConsentManagerOptions;

// Use in your app layout:
// <ConsentManagerProvider options={c15tConfig}>
//   {children}
//   <CookieBanner />
//   <ConsentManagerDialog />
// </ConsentManagerProvider>
