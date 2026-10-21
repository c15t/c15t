import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { activeCampaignTracking } from './activecampaign';

describe('activeCampaignTracking', () => {
	it('matches its public registry and export', () => {
		expectScriptMatchesIntegration(
			'activeCampaignTracking',
			activeCampaignTracking({ accountId: '123456' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://diffuser-cdn.app-us1.com/diffuser/diffuser.js',
			}
		);
	});
	it.each(['', '   ', undefined, null, {}])(
		'skips missing required ID %s',
		(id) => {
			expectSkippedScript(
				() => activeCampaignTracking({ accountId: id as string }),
				{ category: 'marketing', id: 'activecampaign' },
				'activeCampaignTracking: missing or invalid accountId'
			);
		}
	);
	it('trims identifiers and custom loader URLs', () => {
		expect(
			activeCampaignTracking({
				accountId: ' 123456 ',
				scriptUrl: ' https://example.com/vendor.js ',
			}).src
		).toBe('https://example.com/vendor.js');
		expect(
			activeCampaignTracking({ accountId: '123456', scriptUrl: '   ' }).src
		).toBe('https://diffuser-cdn.app-us1.com/diffuser/diffuser.js');
	});
});
