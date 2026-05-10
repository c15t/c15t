import { describe, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from './__tests__/helpers';
import { tiktokPixel } from './tiktok-pixel';

describe('tiktokPixel', () => {
	setupScriptHelperTest();

	it('matches registry metadata and default script output', () => {
		expectScriptMatchesIntegration(
			'tiktokPixel',
			tiktokPixel({ pixelId: 'tt-123' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=tt-123&lib=ttq',
			}
		);
	});
});
