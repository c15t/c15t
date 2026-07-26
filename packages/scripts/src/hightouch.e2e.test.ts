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
	HIGHTOUCH_QUEUE_METHODS,
	hightouch,
} from './vendors/analytics/hightouch';

type HightouchQueue = unknown[] & {
	_loadOptions?: Record<string, unknown>;
	_writeKey?: string;
	[key: string]: unknown;
};

describe('hightouch contract', () => {
	registerVendorContractCleanup();

	it('boots the htevents queue and methods before the loader appends', () => {
		let methodTypes: Record<string, string> | undefined;
		let queueSnapshot: unknown[] | undefined;
		let scriptSrc: string | undefined;
		let writeKey: string | undefined;
		let loadOptions: Record<string, unknown> | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.hightouch-events.com/browser')) {
				return;
			}

			const htevents = win.htevents as HightouchQueue | undefined;
			scriptSrc = node.src;
			writeKey = htevents?._writeKey;
			loadOptions = htevents?._loadOptions;
			methodTypes = Object.fromEntries(
				HIGHTOUCH_QUEUE_METHODS.map((method) => [
					method,
					typeof htevents?.[method],
				])
			);

			htevents?.track?.('Signup', { plan: 'pro' });
			queueSnapshot = Array.from(htevents ?? []);

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...hightouch({
						writeKey: 'HIGHTOUCH-CONTRACT',
						apiHost: 'us-east-1.hightouch-events.com',
					}),
					id: 'hightouch-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(scriptSrc).toContain('/browser/release/v1-latest/events.min.js');
		expect(writeKey).toBe('HIGHTOUCH-CONTRACT');
		expect(loadOptions).toEqual({
			apiHost: 'us-east-1.hightouch-events.com',
		});
		expect(methodTypes).toEqual(
			Object.fromEntries(
				HIGHTOUCH_QUEUE_METHODS.map((method) => [method, 'function'])
			)
		);
		expect(queueSnapshot).toEqual([
			[
				'load',
				'HIGHTOUCH-CONTRACT',
				{ apiHost: 'us-east-1.hightouch-events.com' },
			],
			['page'],
			['track', 'Signup', { plan: 'pro' }],
		]);
	});

	it('omits page when trackPageView is false', () => {
		let queueSnapshot: unknown[] | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.hightouch-events.com/browser')) {
				return;
			}

			queueSnapshot = Array.from((win.htevents as HightouchQueue) ?? []);
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...hightouch({
						writeKey: 'HIGHTOUCH-CONTRACT',
						trackPageView: false,
					}),
					id: 'hightouch-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(queueSnapshot).toEqual([['load', 'HIGHTOUCH-CONTRACT', {}]]);
	});

	it('waits for measurement consent before appending the loader', () => {
		let appended = false;

		installHeadProbe((node) => {
			if (node.src.includes('cdn.hightouch-events.com/browser')) {
				appended = true;
			}
		});

		loadScripts(
			[
				{
					...hightouch({ writeKey: 'HIGHTOUCH-CONTRACT' }),
					id: 'hightouch-contract',
				},
			],
			deniedConsents
		);

		expect(appended).toBe(false);
		expect(window.htevents).toBeUndefined();
	});
});
