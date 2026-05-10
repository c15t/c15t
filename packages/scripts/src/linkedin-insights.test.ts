import { describe, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from './__tests__/helpers';
import { linkedinInsights } from './linkedin-insights';

describe('linkedinInsights', () => {
	setupScriptHelperTest();

	it('matches registry metadata and default script output', () => {
		expectScriptMatchesIntegration(
			'linkedinInsights',
			linkedinInsights({ id: '987654' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: undefined,
				src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
			}
		);
	});
});
