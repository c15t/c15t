import { defineConsentConfig } from 'c15t/next';

// The docs' c15t.config.ts throws when NEXT_PUBLIC_C15T_BACKEND_URL is unset.
// Without an Inth project we fall back to offline mode instead (see
// components/consent.tsx), so the hosted config is optional here.
const backendURL = process.env.NEXT_PUBLIC_C15T_BACKEND_URL;

export const consentConfig = backendURL
	? defineConsentConfig({
			backendURL,
			manifestURL: '/api/c15t/manifest',
		})
	: null;
