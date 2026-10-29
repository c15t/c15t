import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { hubspot } from './hubspot';

describe('hubspot', () => {
	setupScriptHelperTest();
	it('matches registry metadata and the official loader URL', () => {
		expectScriptMatchesIntegration('hubspot', hubspot({ portalId: '53' }), {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://js.hs-scripts.com/53.js',
		});
	});
	it('skips invalid required IDs', () => {
		for (const id of ['', ' ', undefined, null, {}]) {
			expectSkippedScript(
				() => hubspot({ portalId: id as string }),
				{ category: 'marketing', id: 'hubspot' },
				'hubspot: missing or invalid portalId'
			);
		}
	});
	it('uses custom URLs and falls back for blank overrides', () => {
		expect(
			hubspot({
				...{ portalId: '53' },
				scriptUrl: 'https://cdn.example.com/vendor.js',
			}).src
		).toBe('https://cdn.example.com/vendor.js');
		expect(hubspot({ ...{ portalId: '53' }, scriptUrl: '   ' }).src).toBe(
			'https://js.hs-scripts.com/53.js'
		);
	});
});
