/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	deniedConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { adobeAnalytics } from './vendors/analytics/adobe-analytics';

describe('adobeAnalytics contract', () => {
	registerVendorContractCleanup();

	it('gates loading on measurement consent and seeds adobeDataLayer before append', () => {
		let appendCount = 0;
		let asyncAttribute: boolean | undefined;
		let seededBeforeAppend = false;

		installHeadProbe((node) => {
			if (
				!node.src.startsWith('https://assets.adobedtm.com/c15tfake/c15tfake')
			) {
				return;
			}

			appendCount += 1;
			asyncAttribute = node.async;
			seededBeforeAppend = Array.isArray(window.adobeDataLayer);
			node.dispatchEvent(new Event('load'));
		});

		const script = {
			...adobeAnalytics({
				scriptUrl:
					'https://assets.adobedtm.com/c15tfake/c15tfake/launch-c15tfake.min.js',
			}),
			id: 'adobe-analytics-contract',
		};

		loadScripts([script], deniedConsents);
		expect(appendCount).toBe(0);
		expect(window.adobeDataLayer).toBeUndefined();

		loadScripts([script], grantedMeasurementConsents);

		expect(appendCount).toBe(1);
		expect(asyncAttribute).toBe(true);
		expect(seededBeforeAppend).toBe(true);
		expect(window.adobeDataLayer).toEqual([]);
	});

	it('forwards async: false to the script element for legacy sync embeds', () => {
		let asyncAttribute: boolean | undefined;

		installHeadProbe((node) => {
			if (!node.src.startsWith('https://assets.adobedtm.com/')) {
				return;
			}

			asyncAttribute = node.async;
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...adobeAnalytics({
						scriptUrl:
							'https://assets.adobedtm.com/c15tfake/c15tfake/launch-sync.min.js',
						async: false,
					}),
					id: 'adobe-analytics-sync-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(asyncAttribute).toBe(false);
	});

	it('throws for a non-https scriptUrl', () => {
		expect(() =>
			adobeAnalytics({
				scriptUrl: 'http://assets.adobedtm.com/c15tfake/launch.min.js',
			})
		).toThrowError(
			'adobeAnalytics: invalid scriptUrl - must use https: from your Adobe Data Collection embed code'
		);
	});
});
