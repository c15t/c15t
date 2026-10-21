import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { clay } from './clay';

describe('clay', () => {
	setupScriptHelperTest();
	it('matches registry metadata and the official loader URL', () => {
		expectScriptMatchesIntegration('clay', clay({ siteId: 'c15tfake' }), {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://static.claydar.com/init.v1.js?id=c15tfake',
		});
	});
	it('skips invalid required IDs', () => {
		for (const id of ['', ' ', 42, undefined, null, {}]) {
			expectSkippedScript(
				() => clay({ siteId: id as string }),
				{ category: 'marketing', id: 'clay' },
				'clay: missing or invalid siteId'
			);
		}
	});
	it('uses custom URLs and falls back for blank overrides', () => {
		expect(
			clay({
				...{ siteId: 'c15tfake' },
				scriptUrl: 'https://cdn.example.com/vendor.js',
			}).src
		).toBe('https://cdn.example.com/vendor.js');
		expect(clay({ ...{ siteId: 'c15tfake' }, scriptUrl: '   ' }).src).toBe(
			'https://static.claydar.com/init.v1.js?id=c15tfake'
		);
	});
});

it('trims and encodes the site ID', () => {
	expect(clay({ siteId: ' a/b?c ' }).src).toBe(
		'https://static.claydar.com/init.v1.js?id=a%2Fb%3Fc'
	);
});
