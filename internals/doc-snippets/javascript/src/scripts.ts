// The quickstart's script list, which the snippets in this folder import.
import { posthog } from '@c15t/integrations/posthog';

export const scripts = [
	posthog({
		id: 'phc_your_project_key',
		initOptions: { cookieless_mode: 'never' },
		loadMode: 'after-consent',
	}),
];
