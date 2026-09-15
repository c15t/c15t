import { posthog } from '@c15t/scripts/posthog';
import { xPixel } from '@c15t/scripts/x-pixel';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const xPixelId = import.meta.env.VITE_X_PIXEL_ID;

export const scripts = [
	...(posthogKey
		? [
				posthog({
					apiHost: import.meta.env.VITE_POSTHOG_HOST,
					id: posthogKey,
					initOptions: { cookieless_mode: 'never' },
					loadMode: 'after-consent',
				}),
			]
		: []),
	...(xPixelId ? [xPixel({ pixelId: xPixelId })] : []),
];
