import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { theTradeDeskPixel } from './the-trade-desk';

describe('theTradeDeskPixel', () => {
	setupScriptHelperTest();
	it('matches registry metadata and the official loader URL', () => {
		expectScriptMatchesIntegration(
			'theTradeDeskPixel',
			theTradeDeskPixel({ advertiserId: 'c15tfake', pixelIds: ['c15tfake'] }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://js.adsrvr.org/up_loader.3.0.0.js',
			}
		);
	});
	it('skips invalid required IDs', () => {
		for (const id of ['', ' ', undefined, null, {}]) {
			expectSkippedScript(
				() =>
					theTradeDeskPixel({
						advertiserId: id as string,
						pixelIds: ['c15tfake'],
					}),
				{ category: 'marketing', id: 'the-trade-desk' },
				'theTradeDeskPixel: missing or invalid advertiserId'
			);
		}
	});
	it('uses custom URLs and falls back for blank overrides', () => {
		expect(
			theTradeDeskPixel({
				...{ advertiserId: 'c15tfake', pixelIds: ['c15tfake'] },
				scriptUrl: 'https://cdn.example.com/vendor.js',
			}).src
		).toBe('https://cdn.example.com/vendor.js');
		expect(
			theTradeDeskPixel({
				...{ advertiserId: 'c15tfake', pixelIds: ['c15tfake'] },
				scriptUrl: '   ',
			}).src
		).toBe('https://js.adsrvr.org/up_loader.3.0.0.js');
	});
	it('rejects absent, empty or partially blank pixel arrays', () => {
		for (const pixelIds of [undefined, null, [], [''], ['ok', '  '], [null]]) {
			expectSkippedScript(
				() =>
					theTradeDeskPixel({
						advertiserId: 'ok',
						pixelIds: pixelIds as string[],
					}),
				{ category: 'marketing', id: 'the-trade-desk' },
				'theTradeDeskPixel: missing or invalid pixelIds'
			);
		}
	});
});
