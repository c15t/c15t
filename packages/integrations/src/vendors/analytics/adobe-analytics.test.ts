import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { adobeAnalytics } from './adobe-analytics';

describe('adobeAnalytics', () => {
	setupScriptHelperTest();

	it('matches registry metadata with the Adobe Tags embed URL', () => {
		const script = adobeAnalytics({
			scriptUrl:
				'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
		});

		expectScriptMatchesIntegration('adobeAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
		});
		expect(script.async).toBe(true);
	});

	it('trims the script URL before loading', () => {
		const script = adobeAnalytics({
			scriptUrl:
				' https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js ',
		});

		expect(script.src).toBe(
			'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js'
		);
	});

	it('supports synchronous deployment', () => {
		const script = adobeAnalytics({
			async: false,
			scriptUrl:
				'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
		});

		expect(script.async).toBe(false);
	});

	it('seeds adobeDataLayer before loading by default', () => {
		const script = adobeAnalytics({
			scriptUrl:
				'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
		});
		const globalRef = getTestGlobal();

		runOnBeforeLoad(script);

		expect(globalRef.adobeDataLayer).toEqual([]);
	});

	it('does not replace an existing adobeDataLayer', () => {
		const script = adobeAnalytics({
			scriptUrl:
				'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
		});
		const globalRef = getTestGlobal();
		const existingQueue = [{ event: 'pageView' }];
		globalRef.adobeDataLayer = existingQueue;

		runOnBeforeLoad(script);

		expect(globalRef.adobeDataLayer).toBe(existingQueue);
	});

	it('allows data layer seeding to be disabled', () => {
		const script = adobeAnalytics({
			scriptUrl:
				'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
			seedAdobeDataLayer: false,
		});
		const globalRef = getTestGlobal();

		runOnBeforeLoad(script);

		expect(globalRef.adobeDataLayer).toBeUndefined();
	});

	it('logs and skips the script for an empty scriptUrl', () => {
		expectSkippedScript(
			() => adobeAnalytics({ scriptUrl: '   ' }),
			{ category: 'measurement', id: 'adobe-analytics' },
			'adobeAnalytics: missing or invalid scriptUrl'
		);
	});

	it('logs and skips the script for a non-https scriptUrl', () => {
		expectSkippedScript(
			() =>
				adobeAnalytics({
					scriptUrl: 'http://assets.adobedtm.com/c15tfake/launch.min.js',
				}),
			{ category: 'measurement', id: 'adobe-analytics' },
			'adobeAnalytics: invalid scriptUrl - must use https: from your Adobe Data Collection embed code'
		);
	});
});
