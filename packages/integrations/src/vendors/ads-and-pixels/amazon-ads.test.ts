import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { amazonAdsTag } from './amazon-ads';

describe('amazonAdsTag', () => {
	setupScriptHelperTest();
	it('matches registry metadata and the official loader URL', () => {
		expectScriptMatchesIntegration(
			'amazonAdsTag',
			amazonAdsTag({ tagId: '00000000-0000-0000-0000-000000000000' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://c.amazon-adsystem.com/aat/amzn.js',
			}
		);
	});
	it('skips invalid required IDs', () => {
		for (const id of ['', ' ', undefined, null, {}]) {
			expectSkippedScript(
				() => amazonAdsTag({ tagId: id as string }),
				{ category: 'marketing', id: 'amazon-ads' },
				'amazonAdsTag: missing or invalid tagId'
			);
		}
	});
	it('uses custom URLs and falls back for blank overrides', () => {
		expect(
			amazonAdsTag({
				...{ tagId: '00000000-0000-0000-0000-000000000000' },
				scriptUrl: 'https://cdn.example.com/vendor.js',
			}).src
		).toBe('https://cdn.example.com/vendor.js');
		expect(
			amazonAdsTag({
				...{ tagId: '00000000-0000-0000-0000-000000000000' },
				scriptUrl: '   ',
			}).src
		).toBe('https://c.amazon-adsystem.com/aat/amzn.js');
	});
});
