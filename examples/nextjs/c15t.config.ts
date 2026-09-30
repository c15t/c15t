// #region docs:config
import { defineConsentConfig } from 'c15t/next';

// #hide docs
import { testBackend } from './lib/test-backend';

// #endhide docs
export const consentConfig = defineConsentConfig({
	backendURL: 'https://your-project.inth.app',
	// #hide docs
	...testBackend('backendURL'),
	// #endhide docs
	manifestURL: '/api/c15t/manifest',
});
// #endregion docs:config
