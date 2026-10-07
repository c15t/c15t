// #region docs:scripts
import { posthog } from '@c15t/integrations/posthog';
import type { Script } from 'c15t';

export const scripts: Script[] = [
	posthog({
		id: 'phc_your_project_key',
		initOptions: { cookieless_mode: 'never' },
		loadMode: 'after-consent',
	}),
];
// #endregion docs:scripts
