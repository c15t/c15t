import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { fullStory } from './fullstory';

describe('fullStory', () => {
	it('matches its public registry and export', () => {
		expectScriptMatchesIntegration(
			'fullStory',
			fullStory({ orgId: 'YOUR_ORG_ID' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://edge.fullstory.com/s/fs.js?org=YOUR_ORG_ID',
			}
		);
	});
	it.each(['', '   ', undefined, null, {}])(
		'skips missing required ID %s',
		(id) => {
			expectSkippedScript(
				() => fullStory({ orgId: id as string }),
				{ category: 'measurement', id: 'fullstory' },
				'fullStory: missing or invalid orgId'
			);
		}
	);
	it('trims identifiers and custom loader URLs', () => {
		expect(
			fullStory({
				orgId: ' YOUR_ORG_ID ',
				scriptUrl: ' https://example.com/vendor.js ',
			}).src
		).toBe('https://example.com/vendor.js');
		expect(fullStory({ orgId: 'YOUR_ORG_ID', scriptUrl: '   ' }).src).toBe(
			'https://edge.fullstory.com/s/fs.js?org=YOUR_ORG_ID'
		);
	});
});
