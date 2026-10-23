import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { luckyOrange } from './lucky-orange';

describe('luckyOrange', () => {
	it('matches its public registry and export', () => {
		expectScriptMatchesIntegration(
			'luckyOrange',
			luckyOrange({ siteId: 'YOUR_SITE_ID' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://tools.luckyorange.com/core/lo.js?site-id=YOUR_SITE_ID',
			}
		);
	});
	it.each(['', '   ', undefined, null, {}])(
		'skips missing required ID %s',
		(id) => {
			expectSkippedScript(
				() => luckyOrange({ siteId: id as string }),
				{ category: 'measurement', id: 'lucky-orange' },
				'luckyOrange: missing or invalid siteId'
			);
		}
	);
	it('trims identifiers and custom loader URLs', () => {
		expect(
			luckyOrange({
				scriptUrl: ' https://example.com/vendor.js ',
				siteId: ' YOUR_SITE_ID ',
			}).src
		).toBe('https://example.com/vendor.js');
		expect(luckyOrange({ scriptUrl: '   ', siteId: 'YOUR_SITE_ID' }).src).toBe(
			'https://tools.luckyorange.com/core/lo.js?site-id=YOUR_SITE_ID'
		);
	});
});
