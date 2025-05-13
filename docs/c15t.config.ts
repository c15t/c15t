// c15t Client Configuration
import type { ConsentManagerOptions } from '@c15t/nextjs';

export const c15tConfig = {
	// Using hosted c15t (consent.io) or self-hosted instance
	mode: 'c15t',
	backendURL: 'https://kaylee-111k27-us-east-correct-cors.kaylee.workers.dev/',
	store: {
		initialGdprTypes: ['necessary', 'marketing'],
	},
} satisfies ConsentManagerOptions;

// Use in your app layout:
// <ConsentManagerProvider options={c15tConfig}>
//   {children}
//   <CookieBanner />
//   <ConsentManagerDialog />
// </ConsentManagerProvider>
