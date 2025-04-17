// c15t Client Configuration
import type { ConsentManagerOptions } from '@c15t/react';
import { createCustomHandlers } from './consent-handlers';

export const c15tConfig = {
	// Using custom mode for complete control
	mode: 'custom',
	endpointHandlers: createCustomHandlers(),

	// Optional: Add callback functions for various events
	callbacks: {
		onConsentSet: (response) => {
			console.log('Consent has been saved');
		},
	},
} satisfies ConsentManagerOptions;

// Use in your app layout:
// <ConsentManagerProvider options={c15tConfig}>
//   {children}
//   <CookieBanner />
//   <ConsentManagerDialog />
// </ConsentManagerProvider>

// Don't forget to implement your custom handlers in consent-handlers.ts!
