import { describe, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from './__tests__/helpers';
import { metaPixel } from './meta-pixel';

describe('metaPixel', () => {
	setupScriptHelperTest();

	it('matches registry metadata and default script output', () => {
		expectScriptMatchesIntegration(
			'metaPixel',
			metaPixel({ pixelId: '123456' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://connect.facebook.net/en_US/fbevents.js',
			}
		);
	});
});
