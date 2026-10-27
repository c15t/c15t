import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { adrollPixel } from './adroll';

describe('adrollPixel', () => {
	setupScriptHelperTest();
	it('matches registry metadata and the official loader URL', () => {
		expectScriptMatchesIntegration(
			'adrollPixel',
			adrollPixel({ advertiserId: 'c15tfake', pixelId: 'c15tfake' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://s.adroll.com/j/c15tfake/roundtrip.js',
			}
		);
	});
	it('skips invalid required IDs', () => {
		for (const id of ['', ' ', undefined, null, {}]) {
			expectSkippedScript(
				() => adrollPixel({ advertiserId: id as string, pixelId: 'c15tfake' }),
				{ category: 'marketing', id: 'adroll' },
				'adrollPixel: missing or invalid advertiserId'
			);
		}
	});
	it('uses custom URLs and falls back for blank overrides', () => {
		expect(
			adrollPixel({
				...{ advertiserId: 'c15tfake', pixelId: 'c15tfake' },
				scriptUrl: 'https://cdn.example.com/vendor.js',
			}).src
		).toBe('https://cdn.example.com/vendor.js');
		expect(
			adrollPixel({
				...{ advertiserId: 'c15tfake', pixelId: 'c15tfake' },
				scriptUrl: '   ',
			}).src
		).toBe('https://s.adroll.com/j/c15tfake/roundtrip.js');
	});
});
