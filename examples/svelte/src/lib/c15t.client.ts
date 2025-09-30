// c15t Client Configuration
import { type ConsentManagerOptions, configureConsentManager } from 'c15t';

export const c15tConfig = {
	// Using offline mode for browser-based storage
	mode: 'offline',

	// Optional: Add callback functions for various events
	callbacks: {
		onConsentSet: (response: any) => {
			console.log('Consent has been saved locally');
		},
	},
} satisfies ConsentManagerOptions;

export const consentManager = configureConsentManager(c15tConfig);
