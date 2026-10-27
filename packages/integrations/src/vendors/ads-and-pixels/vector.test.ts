import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { vector } from './vector';

describe('vector', () => {
	setupScriptHelperTest();
	it('matches registry metadata and the official loader URL', () => {
		expectScriptMatchesIntegration(
			'vector',
			vector({ pixelId: '00000000-0000-0000-0000-000000000000' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://cdn.vector.co/pixel.js',
			}
		);
	});
	it('skips invalid required IDs', () => {
		for (const id of ['', ' ', undefined, null, {}]) {
			expectSkippedScript(
				() => vector({ pixelId: id as string }),
				{ category: 'marketing', id: 'vector' },
				'vector: missing or invalid pixelId'
			);
		}
	});
	it('uses custom URLs and falls back for blank overrides', () => {
		expect(
			vector({
				...{ pixelId: '00000000-0000-0000-0000-000000000000' },
				scriptUrl: 'https://cdn.example.com/vendor.js',
			}).src
		).toBe('https://cdn.example.com/vendor.js');
		expect(
			vector({
				...{ pixelId: '00000000-0000-0000-0000-000000000000' },
				scriptUrl: '   ',
			}).src
		).toBe('https://cdn.vector.co/pixel.js');
	});
});
