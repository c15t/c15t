import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { pendo } from './pendo';

describe('pendo', () => {
	it('matches its public registry and export', () => {
		expectScriptMatchesIntegration('pendo', pendo({ apiKey: 'YOUR_API_KEY' }), {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://cdn.pendo.io/agent/static/YOUR_API_KEY/pendo.js',
		});
	});
	it.each(['', '   ', undefined, null, {}])(
		'skips missing required ID %s',
		(id) => {
			expectSkippedScript(
				() => pendo({ apiKey: id as string }),
				{ category: 'measurement', id: 'pendo' },
				'pendo: missing or invalid apiKey'
			);
		}
	);
	it('trims identifiers and custom loader URLs', () => {
		expect(
			pendo({
				apiKey: ' YOUR_API_KEY ',
				scriptUrl: ' https://example.com/vendor.js ',
			}).src
		).toBe('https://example.com/vendor.js');
		expect(pendo({ apiKey: 'YOUR_API_KEY', scriptUrl: '   ' }).src).toBe(
			'https://cdn.pendo.io/agent/static/YOUR_API_KEY/pendo.js'
		);
	});
});
