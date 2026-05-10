import { describe, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from './__tests__/helpers';
import { xPixel } from './x-pixel';

describe('xPixel', () => {
	setupScriptHelperTest();

	it('matches registry metadata and default script output', () => {
		expectScriptMatchesIntegration('xPixel', xPixel({ pixelId: 'tw-123' }), {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.ads-twitter.com/uwt.js',
		});
	});
});
