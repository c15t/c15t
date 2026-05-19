/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import { segment } from './vendors/analytics/segment';

type SegmentQueue = unknown[] & {
	alias?: (...args: unknown[]) => void;
	group?: (...args: unknown[]) => void;
	identify?: (...args: unknown[]) => void;
	page?: (...args: unknown[]) => void;
	reset?: (...args: unknown[]) => void;
	track?: (...args: unknown[]) => void;
};

describe('segment contract', () => {
	registerVendorContractCleanup();

	it('boots the analytics.js queue and methods before the loader appends', () => {
		let methodTypes: Record<string, string> | undefined;
		let queueSnapshot: unknown[] | undefined;
		let scriptSrc: string | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.segment.com/analytics.js')) {
				return;
			}

			const analytics = win.analytics as SegmentQueue | undefined;
			scriptSrc = node.src;
			methodTypes = {
				alias: typeof analytics?.alias,
				group: typeof analytics?.group,
				identify: typeof analytics?.identify,
				page: typeof analytics?.page,
				reset: typeof analytics?.reset,
				track: typeof analytics?.track,
			};

			analytics?.track?.('Signup', { plan: 'pro' });
			queueSnapshot = Array.from(analytics ?? []);

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...segment({ writeKey: 'SEGMENT-CONTRACT' }),
					id: 'segment-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(scriptSrc).toContain(
			'/analytics.js/v1/SEGMENT-CONTRACT/analytics.min.js'
		);
		expect(methodTypes).toEqual({
			alias: 'function',
			group: 'function',
			identify: 'function',
			page: 'function',
			reset: 'function',
			track: 'function',
		});
		expect(queueSnapshot).toEqual([
			['page'],
			['track', 'Signup', { plan: 'pro' }],
		]);
	});
});
