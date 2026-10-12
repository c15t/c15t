// #region docs:quickstart-config title="c15t.config.ts"
import { posthog } from '@c15t/integrations/posthog';
import { defineConsentConfig } from 'c15t/next';

export default defineConsentConfig({
	scripts: [
		posthog({
			id: 'phc_your_project_key',
			initOptions: { cookieless_mode: 'never' },
			loadMode: 'after-consent',
		}),
	],
});
// #endregion docs:quickstart-config
