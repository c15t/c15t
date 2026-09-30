// #region docs:scripts
import { posthog } from '@c15t/integrations/posthog';
import { xPixel } from '@c15t/integrations/x-pixel';

export const scripts = [
	posthog({
		id: 'phc_your_project_key',
		initOptions: { cookieless_mode: 'never' },
		loadMode: 'after-consent',
		region: 'eu',
	}),
	xPixel({ pixelId: 'your-pixel-id' }),
];
// #endregion docs:scripts
