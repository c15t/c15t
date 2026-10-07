import { defineConsentConfig } from 'c15t/next';

export const consentConfig = defineConsentConfig({
	backendURL: 'https://your-project.inth.app',
	manifestURL: '/api/c15t/manifest',
});
