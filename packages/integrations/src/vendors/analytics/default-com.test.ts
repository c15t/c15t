import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { defaultComPixel } from './default-com';

describe('defaultComPixel', () => {
	setupScriptHelperTest();
	it('matches registry metadata and the official loader URL', () => {
		expectScriptMatchesIntegration(
			'defaultComPixel',
			defaultComPixel({ publicKey: 'c15tfake' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://handshake.default.com/index.js',
			}
		);
	});
	it('skips invalid required IDs', () => {
		for (const id of ['', ' ', undefined, null, {}]) {
			expectSkippedScript(
				() => defaultComPixel({ publicKey: id as string }),
				{ category: 'measurement', id: 'default-com' },
				'defaultComPixel: missing or invalid publicKey'
			);
		}
	});
	it('uses custom URLs and falls back for blank overrides', () => {
		expect(
			defaultComPixel({
				...{ publicKey: 'c15tfake' },
				scriptUrl: 'https://cdn.example.com/vendor.js',
			}).src
		).toBe('https://cdn.example.com/vendor.js');
		expect(
			defaultComPixel({ ...{ publicKey: 'c15tfake' }, scriptUrl: '   ' }).src
		).toBe('https://handshake.default.com/index.js');
	});
});
