import { defineConsentConfig } from 'c15t/next';

/** The App Router guide's shared config, pointed at the local mock backend. */
export const consentConfig = defineConsentConfig({
	backendURL: '/mock-backend',
	manifestURL: '/mock-backend/manifest',
});
