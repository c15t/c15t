/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	grantedMarketingConsents,
	installHeadProbe,
	isArgumentsPayload,
	loadScripts,
	registerVendorContractCleanup,
	toArgs,
} from './e2e-test-utils';
import { xPixel } from './x-pixel';

describe('xPixel contract', () => {
	registerVendorContractCleanup();

	it('boots with the vendor queue shape and config call intact', () => {
		let acknowledged = false;
		let queueSnapshot: unknown[] = [];

		installHeadProbe((node, win) => {
			if (!node.src.includes('static.ads-twitter.com/uwt.js')) {
				return;
			}

			const twq = win.twq as
				| ((...args: unknown[]) => void)
				| (Record<string, unknown> & { queue?: unknown[] });
			const queue = (twq as { queue?: unknown[] }).queue ?? [];
			queueSnapshot = queue;
			acknowledged =
				(twq as { version?: string }).version === '1.1' &&
				queue.length === 1 &&
				isArgumentsPayload(queue[0]) &&
				JSON.stringify(toArgs(queue[0])) ===
					JSON.stringify(['config', 'TW-CONTRACT']);

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...xPixel({ pixelId: 'TW-CONTRACT' }),
					id: 'x-pixel-contract',
				},
			],
			grantedMarketingConsents
		);

		expect(acknowledged).toBe(true);
		expect(Array.isArray(queueSnapshot[0])).toBe(false);
	});
});
