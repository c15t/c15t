import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { liveIntentTag } from './liveintent';

describe('liveIntentTag', () => {
	setupScriptHelperTest();
	it('matches registry metadata and the official loader URL', () => {
		expectScriptMatchesIntegration(
			'liveIntentTag',
			liveIntentTag({ tagId: 'a-00xx' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://b-code.liadm.com/a-00xx.min.js',
			}
		);
	});
	it('skips invalid required IDs', () => {
		for (const id of ['', ' ', undefined, null, {}]) {
			expectSkippedScript(
				() => liveIntentTag({ tagId: id as string }),
				{ category: 'marketing', id: 'liveintent' },
				'liveIntentTag: missing or invalid tagId'
			);
		}
	});
	it('uses custom URLs and falls back for blank overrides', () => {
		expect(
			liveIntentTag({
				...{ tagId: 'a-00xx' },
				scriptUrl: 'https://cdn.example.com/vendor.js',
			}).src
		).toBe('https://cdn.example.com/vendor.js');
		expect(
			liveIntentTag({ ...{ tagId: 'a-00xx' }, scriptUrl: '   ' }).src
		).toBe('https://b-code.liadm.com/a-00xx.min.js');
	});
});
