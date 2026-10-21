import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { rb2b } from './rb2b';

describe('rb2b', () => {
	setupScriptHelperTest();
	it('matches registry metadata and the official loader URL', () => {
		expectScriptMatchesIntegration('rb2b', rb2b({ accountKey: 'c15tfake' }), {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://ddwl4m2hdecbv.cloudfront.net/b/c15tfake/c15tfake.js.gz',
		});
	});
	it('skips invalid required IDs', () => {
		for (const id of ['', ' ', undefined, null, {}, 42]) {
			expectSkippedScript(
				() => rb2b({ accountKey: id as string }),
				{ category: 'marketing', id: 'rb2b' },
				'rb2b: missing or invalid accountKey'
			);
		}
	});
	it('uses custom URLs and falls back for blank overrides', () => {
		expect(
			rb2b({
				...{ accountKey: 'c15tfake' },
				scriptUrl: 'https://cdn.example.com/vendor.js',
			}).src
		).toBe('https://cdn.example.com/vendor.js');
		expect(rb2b({ ...{ accountKey: 'c15tfake' }, scriptUrl: '   ' }).src).toBe(
			'https://ddwl4m2hdecbv.cloudfront.net/b/c15tfake/c15tfake.js.gz'
		);
	});
});

it('encodes the trimmed key in both path segments', () => {
	expect(rb2b({ accountKey: ' a/b?c ' }).src).toBe(
		'https://ddwl4m2hdecbv.cloudfront.net/b/a%2Fb%3Fc/a%2Fb%3Fc.js.gz'
	);
});
