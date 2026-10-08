// #region docs:config
import { defineConsentConfig } from 'c15t/next';

export const consentConfig = defineConsentConfig({
	backendURL:
		process.env.NEXT_PUBLIC_C15T_BACKEND_URL ??
		'https://benchmarks-inth.inth.app',
	manifestURL: '/api/c15t/manifest',
});
// #endregion docs:config
