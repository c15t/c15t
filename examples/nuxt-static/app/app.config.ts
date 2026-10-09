import { posthog } from '@c15t/integrations/posthog';

export default defineAppConfig({
	c15t: {
		scripts: [
			posthog({
				id: 'phc_your_project_key',
				initOptions: { cookieless_mode: 'never' },
				loadMode: 'after-consent',
			}),
		],
	},
});
