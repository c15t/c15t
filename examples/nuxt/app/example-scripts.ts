import { posthog } from '@c15t/integrations/posthog';
import { xPixel } from '@c15t/integrations/x-pixel';

export const createExampleScripts = (
	posthogKey?: string,
	xPixelId?: string
) => [
	...(posthogKey
		? [
				posthog({
					id: posthogKey,
					initOptions: { cookieless_mode: 'never' },
					loadMode: 'after-consent',
					region: 'eu',
				}),
			]
		: []),
	...(xPixelId ? [xPixel({ pixelId: xPixelId })] : []),
];
