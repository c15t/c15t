// #region docs:init
import { init, manifest } from '@c15t/browser';
import { posthog } from '@c15t/integrations/posthog';

init({
	mode: manifest(),
	scripts: [
		posthog({
			id: 'phc_your_project_key',
			initOptions: { cookieless_mode: 'never' },
			loadMode: 'after-consent',
		}),
	],
});
// #endregion docs:init
