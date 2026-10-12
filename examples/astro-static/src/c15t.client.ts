import { posthog } from '@c15t/integrations/posthog';
import type { C15tClientOptionsExtension } from 'c15t/astro';

export default {
	scripts: [
		posthog({
			id: 'phc_your_project_key',
			initOptions: { cookieless_mode: 'never' },
			loadMode: 'after-consent',
		}),
	],
} satisfies C15tClientOptionsExtension;
