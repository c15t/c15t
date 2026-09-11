import { posthog } from '@c15t/scripts/posthog';
import { xPixel } from '@c15t/scripts/x-pixel';
import type { Script } from 'c15t';

export const scripts: Script[] = [];

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
	scripts.push(
		posthog({
			apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
			id: process.env.NEXT_PUBLIC_POSTHOG_KEY,
			initOptions: { cookieless_mode: 'never' },
			loadMode: 'after-consent',
		})
	);
}

if (process.env.NEXT_PUBLIC_X_PIXEL_ID) {
	scripts.push(xPixel({ pixelId: process.env.NEXT_PUBLIC_X_PIXEL_ID }));
}
