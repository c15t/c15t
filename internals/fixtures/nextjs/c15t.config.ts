import { defineConsentConfig } from 'c15t/next';

import { testBackend } from './lib/test-backend';

export const consentConfig = defineConsentConfig({
	backendURL: 'https://your-project.inth.app',
	...testBackend('backendURL'),
	manifestURL: '/api/c15t/manifest',
});
