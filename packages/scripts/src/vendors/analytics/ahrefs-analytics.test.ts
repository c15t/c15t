import { describe, expect, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { ahrefsAnalytics } from './ahrefs-analytics';

describe('ahrefsAnalytics', () => {
	setupScriptHelperTest();

	it('matches registry metadata with the default loader', () => {
		const script = ahrefsAnalytics({ key: 'ahrefs-project-key' });

		expectScriptMatchesIntegration('ahrefsAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://analytics.ahrefs.com/analytics.js',
		});
		expect(script.attributes).toEqual({
			'data-key': 'ahrefs-project-key',
		});
	});

	it('honors a custom loader URL', () => {
		const script = ahrefsAnalytics({
			key: 'ahrefs-project-key',
			scriptUrl: 'https://cdn.example.com/ahrefs.js',
		});

		expect(script.src).toBe('https://cdn.example.com/ahrefs.js');
		expect(script.attributes).toEqual({
			'data-key': 'ahrefs-project-key',
		});
	});
});
