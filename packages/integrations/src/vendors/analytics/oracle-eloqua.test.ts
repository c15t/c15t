import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { eloquaTracking } from './oracle-eloqua';

describe('eloquaTracking', () => {
	it('matches its public registry and export', () => {
		expectScriptMatchesIntegration(
			'eloquaTracking',
			eloquaTracking({ siteId: '1973398186' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://img.en25.com/i/elqCfg.min.js',
			}
		);
	});
	it.each(['', '   ', undefined, null, {}])(
		'skips missing required ID %s',
		(id) => {
			expectSkippedScript(
				() => eloquaTracking({ siteId: id as string }),
				{ category: 'marketing', id: 'oracle-eloqua' },
				'eloquaTracking: missing or invalid siteId'
			);
		}
	);
	it('trims identifiers and custom loader URLs', () => {
		expect(
			eloquaTracking({
				scriptUrl: ' https://example.com/vendor.js ',
				siteId: ' 1973398186 ',
			}).src
		).toBe('https://example.com/vendor.js');
		expect(eloquaTracking({ scriptUrl: '   ', siteId: '1973398186' }).src).toBe(
			'https://img.en25.com/i/elqCfg.min.js'
		);
	});
});
