import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { caplessAnalytics } from './capless-analytics';

describe('caplessAnalytics', () => {
	setupScriptHelperTest();

	it('loads c.js asynchronously with the trimmed project key', () => {
		const script = caplessAnalytics({ projectKey: ' cs_test_key ' });
		expectScriptMatchesIntegration('caplessAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://c.capless.sh/c.js',
		});
		expect(script.attributes).toEqual({ 'data-key': 'cs_test_key' });
		expect(script.async).toBe(true);
	});

	it('uses a custom loader URL', () => {
		const script = caplessAnalytics({
			projectKey: 'cs_test_key',
			scriptUrl: ' https://analytics.example.com/c.js ',
		});
		expect(script.src).toBe('https://analytics.example.com/c.js');
	});

	it.each(['', '   '])('skips a blank project key: %j', (projectKey) => {
		expectSkippedScript(
			() => caplessAnalytics({ projectKey }),
			{ category: 'measurement', id: 'capless-analytics' },
			'caplessAnalytics: missing or invalid projectKey'
		);
	});
});
