import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { marketoMunchkin } from './marketo';

describe('marketoMunchkin', () => {
	it('matches its public registry and export', () => {
		expectScriptMatchesIntegration(
			'marketoMunchkin',
			marketoMunchkin({ munchkinId: 'AAA-BBB-CCC' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: undefined,
				src: 'https://munchkin.marketo.net/munchkin.js',
			}
		);
	});
	it.each(['', '   ', undefined, null, {}])(
		'skips missing required ID %s',
		(id) => {
			expectSkippedScript(
				() => marketoMunchkin({ munchkinId: id as string }),
				{ category: 'marketing', id: 'marketo' },
				'marketoMunchkin: missing or invalid munchkinId'
			);
		}
	);
	it('trims identifiers and custom loader URLs', () => {
		expect(
			marketoMunchkin({
				munchkinId: ' AAA-BBB-CCC ',
				scriptUrl: ' https://example.com/vendor.js ',
			}).src
		).toBe('https://example.com/vendor.js');
		expect(
			marketoMunchkin({ munchkinId: 'AAA-BBB-CCC', scriptUrl: '   ' }).src
		).toBe('https://munchkin.marketo.net/munchkin.js');
	});
});
