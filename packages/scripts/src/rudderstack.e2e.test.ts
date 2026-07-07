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
import {
	RUDDERSTACK_QUEUE_METHODS,
	rudderstack,
} from './vendors/analytics/rudderstack';

type RudderStackQueue = unknown[] & {
	snippetExecuted?: boolean;
	[key: string]: unknown;
};

describe('rudderstack contract', () => {
	registerVendorContractCleanup();

	it('boots the rudderanalytics queue and methods before the loader appends', () => {
		let methodTypes: Record<string, string> | undefined;
		let queueSnapshot: unknown[] | undefined;
		let scriptSrc: string | undefined;
		let snippetExecuted: boolean | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.rudderlabs.com/v3/modern/rsa.min.js')) {
				return;
			}

			const rudderanalytics = win.rudderanalytics as
				| RudderStackQueue
				| undefined;
			scriptSrc = node.src;
			snippetExecuted = rudderanalytics?.snippetExecuted;
			methodTypes = Object.fromEntries(
				RUDDERSTACK_QUEUE_METHODS.map((method) => [
					method,
					typeof rudderanalytics?.[method],
				])
			);

			rudderanalytics?.track?.('Signup', { plan: 'pro' });
			queueSnapshot = Array.from(rudderanalytics ?? []);

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...rudderstack({
						writeKey: 'RUDDERSTACK-CONTRACT',
						dataPlaneUrl: 'https://c15t-live-probe.invalid',
						loadOptions: {
							useBeacon: true,
						},
					}),
					id: 'rudderstack-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(scriptSrc).toContain('/v3/modern/rsa.min.js');
		expect(snippetExecuted).toBe(true);
		expect(methodTypes).toEqual(
			Object.fromEntries(
				RUDDERSTACK_QUEUE_METHODS.map((method) => [method, 'function'])
			)
		);
		expect(queueSnapshot).toEqual([
			[
				'load',
				'RUDDERSTACK-CONTRACT',
				'https://c15t-live-probe.invalid',
				{ useBeacon: true },
			],
			['page'],
			['track', 'Signup', { plan: 'pro' }],
		]);
	});

	it('omits page when trackPageView is false', () => {
		let queueSnapshot: unknown[] | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.rudderlabs.com/v3/modern/rsa.min.js')) {
				return;
			}

			queueSnapshot = Array.from(
				(win.rudderanalytics as RudderStackQueue) ?? []
			);
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...rudderstack({
						writeKey: 'RUDDERSTACK-CONTRACT',
						dataPlaneUrl: 'https://c15t-live-probe.invalid',
						trackPageView: false,
					}),
					id: 'rudderstack-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(queueSnapshot).toEqual([
			['load', 'RUDDERSTACK-CONTRACT', 'https://c15t-live-probe.invalid', {}],
		]);
	});

	it('waits for measurement consent before appending the loader', () => {
		let appended = false;

		installHeadProbe((node) => {
			if (node.src.includes('cdn.rudderlabs.com/v3/modern/rsa.min.js')) {
				appended = true;
			}
		});

		loadScripts(
			[
				{
					...rudderstack({
						writeKey: 'RUDDERSTACK-CONTRACT',
						dataPlaneUrl: 'https://c15t-live-probe.invalid',
					}),
					id: 'rudderstack-contract',
				},
			],
			deniedConsents
		);

		expect(appended).toBe(false);
		expect(window.rudderanalytics).toBeUndefined();
	});
});
