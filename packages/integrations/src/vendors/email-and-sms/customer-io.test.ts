import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { customerIo } from './customer-io';

describe('customerIo', () => {
	it('matches its public registry and export', () => {
		expectScriptMatchesIntegration(
			'customerIo',
			customerIo({ writeKey: 'test-key' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://cdp.customer.io/v1/analytics-js/snippet/test-key/analytics.min.js',
			}
		);
	});
	it.each(['', '   ', undefined, null, {}])(
		'skips missing required ID %s',
		(id) => {
			expectSkippedScript(
				() => customerIo({ writeKey: id as string }),
				{ category: 'marketing', id: 'customer-io' },
				'customerIo: missing or invalid writeKey'
			);
		}
	);
	it('trims identifiers and custom loader URLs', () => {
		expect(
			customerIo({
				scriptUrl: ' https://example.com/vendor.js ',
				writeKey: ' test-key ',
			}).src
		).toBe('https://example.com/vendor.js');
		expect(customerIo({ scriptUrl: '   ', writeKey: 'test-key' }).src).toBe(
			'https://cdp.customer.io/v1/analytics-js/snippet/test-key/analytics.min.js'
		);
	});
	it.each([
		'https://proxy.example.com/path',
		'https://proxy.example.com?query=1',
		'https://proxy.example.com#fragment',
		'https://user:pass@proxy.example.com',
		'ftp://proxy.example.com',
		'proxy.example.com',
		'//proxy.example.com',
		'https://',
		'https://[invalid',
		'https://proxy.example.com:invalid',
	])('rejects a CDN value that is not an HTTP(S) origin: %s', (cdnUrl) => {
		expect(() => customerIo({ cdnUrl, writeKey: 'test-key' })).toThrow(
			new Error('customerIo: cdnUrl must be an HTTP(S) origin')
		);
	});
	it('skips a blank key before validating or reusing the CDN configuration', () => {
		for (let attempt = 0; attempt < 2; attempt += 1) {
			expectSkippedScript(
				() => customerIo({ cdnUrl: 'invalid', writeKey: ' ' }),
				{ category: 'marketing', id: 'customer-io' },
				'customerIo: missing or invalid writeKey'
			);
		}
	});
});

it('uses the selected region and escapes the write key as a path segment', () => {
	expect(customerIo({ region: 'eu', writeKey: 'a/b' }).src).toBe(
		'https://cdp-eu.customer.io/v1/analytics-js/snippet/a%2Fb/analytics.min.js'
	);
	expect(() =>
		customerIo({ region: 'invalid' as 'us', writeKey: 'test' })
	).toThrow("customerIo: region must be 'us' or 'eu'");
});
