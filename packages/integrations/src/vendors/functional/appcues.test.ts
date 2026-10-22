import { describe, expect, it } from 'vitest';

import { expectScriptMatchesIntegration } from '../../__tests__/helpers';
import { appcues } from './appcues';

describe('appcues', () => {
	it('matches the registry and defaults to strict experience gating', () => {
		expectScriptMatchesIntegration('appcues', appcues({ accountId: '123' }), {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://fast.appcues.com/123.js',
		});
	});
	it('trims a custom loader URL', () => {
		expect(
			appcues({
				accountId: '123',
				scriptUrl: ' https://example.com/appcues.js ',
			}).src
		).toBe('https://example.com/appcues.js');
	});
});
