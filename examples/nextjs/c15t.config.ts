import { defineConsentConfig } from 'c15t/next';

const backendURL = process.env.NEXT_PUBLIC_C15T_BACKEND_URL;
if (!backendURL) {
	throw new Error(
		'Set NEXT_PUBLIC_C15T_BACKEND_URL to your Inth backend endpoint'
	);
}

export const consentConfig = defineConsentConfig({
	backendURL,
	manifestURL: '/api/c15t/manifest',
});

// Demo location override. GB is the ISO country code for the United Kingdom.
export const demoLocation = { country: 'GB' } as const;
