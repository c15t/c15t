import { defineConsentConfig } from 'c15t/next';

// The backend URL comes from NEXT_PUBLIC_C15T_BACKEND_URL.
export const consentConfig = defineConsentConfig({
	manifestURL: '/api/c15t/manifest',
});
