import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { statableAnalytics } from './statable-analytics';

describe('statableAnalytics', () => {
	setupScriptHelperTest();

	it.each(['12345', 12345, ' 12345 '])(
		'loads the integer site ID %j with matching attributes',
		(siteId) => {
			const script = statableAnalytics({ siteId });
			expectScriptMatchesIntegration('statableAnalytics', script, {
				alwaysLoad: undefined,
				persistAfterConsentRevoked: undefined,
				src: 'https://statable.com/js/12345/s.js',
			});
			expect(script.attributes).toEqual({ 'data-id': '12345' });
			expect(script.defer).toBe(true);
		}
	);

	it.each([
		0,
		-1,
		1.5,
		Infinity,
		Number.NaN,
		'1e3',
		'0x10',
		'12px',
		'1.5',
		'',
		Number.MAX_SAFE_INTEGER + 1,
		'9007199254740992',
	])(
		'skips a site ID that cannot round-trip through the tracker: %j',
		(siteId) => {
			expectSkippedScript(
				() => statableAnalytics({ siteId }),
				{ category: 'measurement', id: 'statable-analytics' },
				'statableAnalytics: missing or invalid siteId'
			);
		}
	);

	it('forwards a custom loader and the complete ingestion endpoint', () => {
		const script = statableAnalytics({
			scriptUrl: 'https://cdn.example.com/js/{siteId}/s.js',
			siteId: 12345,
			trackingApi: ' https://analytics.example.com/api/event ',
		});
		expect(script.src).toBe('https://cdn.example.com/js/12345/s.js');
		expect(script.attributes).toEqual({
			'data-id': '12345',
			'data-tracking-api': 'https://analytics.example.com/api/event',
		});
	});
});
