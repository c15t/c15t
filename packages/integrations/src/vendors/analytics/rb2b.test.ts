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
	it.each([
		'https://ddwl4m2hdecbv.cloudfront.net/b/c15tfake/custom.js?cache=1#loader',
		'https://s3-us-west-2.amazonaws.com/b2bjsstore/b/c15tfake/reb2b.js.gz',
		'https://b2bjsstore.s3.us-west-2.amazonaws.com/b/c15tfake/reb2b.js.gz',
		'https://DDWL4M2HDECBV.CLOUDFRONT.NET:443/b/C15TFAKE/reb2b.js.gz',
		'https://ddwl4m2hdecbv.cloudfront.net/b/other/../C15TFAKE/custom.js?next=/b/OTHER/#loader',
	])('accepts a vendor-supported source: %s', (scriptUrl) => {
		expect(rb2b({ accountKey: 'c15tfake', scriptUrl }).src).toBe(scriptUrl);
	});
	describe.each([
		'https://ddwl4m2hdecbv.cloudfront.net/b/',
		'https://s3-us-west-2.amazonaws.com/b2bjsstore/b/',
		'https://b2bjsstore.s3.us-west-2.amazonaws.com/b/',
	])('account path under %s', (prefix) => {
		it.each([
			'OTHER/OTHER.js.gz?next=/b/c15tfake/',
			'OTHER/OTHER.js.gz#next=/b/c15tfake/',
			'OTHER/b/c15tfake/custom.js',
			'c15tfake?next=/b/c15tfake/',
		])('skips a misplaced account match: %s', (suffix) => {
			expectSkippedScript(
				() => rb2b({ accountKey: 'c15tfake', scriptUrl: `${prefix}${suffix}` }),
				{ category: 'marketing', id: 'rb2b' },
				'rb2b: scriptUrl must use a supported HTTPS CloudFront or S3 prefix and /b/<accountKey>/ path'
			);
		});
		it('accepts the encoded account with a custom filename and URL metadata', () => {
			const scriptUrl = `${prefix}A%2fb%3fc/custom.js?next=/b/OTHER/#loader`;
			expect(rb2b({ accountKey: ' a/b?c ', scriptUrl }).src).toBe(scriptUrl);
		});
	});
	it('falls back for blank overrides', () => {
		expect(rb2b({ accountKey: 'c15tfake', scriptUrl: '   ' }).src).toBe(
			'https://ddwl4m2hdecbv.cloudfront.net/b/c15tfake/c15tfake.js.gz'
		);
	});
	it.each([
		'https://cdn.example.com/vendor.js',
		'https://ddwl4m2hdecbv.cloudfront.net/b/anotherfake/reb2b.js.gz',
		'https://s3-us-west-2.amazonaws.com/anotherbucket/b/c15tfake/reb2b.js.gz',
		'https://ddwl4m2hdecbv.cloudfront.net/b/c15tfake',
		'https://ddwl4m2hdecbv.cloudfront.net.example.com/b/c15tfake/reb2b.js.gz',
		'https://user:password@ddwl4m2hdecbv.cloudfront.net/b/c15tfake/reb2b.js.gz',
		'http://ddwl4m2hdecbv.cloudfront.net/b/c15tfake/reb2b.js.gz',
		'/b/c15tfake/reb2b.js.gz',
		'not a URL',
	])('skips unsupported SDK sources: %s', (scriptUrl) => {
		expectSkippedScript(
			() => rb2b({ accountKey: 'c15tfake', scriptUrl }),
			{ category: 'marketing', id: 'rb2b' },
			'rb2b: scriptUrl must use a supported HTTPS CloudFront or S3 prefix and /b/<accountKey>/ path'
		);
	});
});

it('encodes the trimmed key in both path segments', () => {
	expect(rb2b({ accountKey: ' a/b?c ' }).src).toBe(
		'https://ddwl4m2hdecbv.cloudfront.net/b/a%2Fb%3Fc/a%2Fb%3Fc.js.gz'
	);
});
