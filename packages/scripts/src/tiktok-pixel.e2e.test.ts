/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	grantedMarketingConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	type TikTokQueue,
} from './e2e-test-utils';
import { tiktokPixel } from './tiktok-pixel';

describe('tiktokPixel contract', () => {
	registerVendorContractCleanup();

	it('boots with queued consent/page calls and a post-load consent handshake', () => {
		let acknowledged = false;
		const runtimeCalls: string[] = [];
		let queueSnapshot: unknown[] = [];

		installHeadProbe((node, win) => {
			if (!node.src.includes('analytics.tiktok.com/i18n/pixel/events.js')) {
				return;
			}

			const queue = win.ttq as unknown[];
			queueSnapshot = Array.isArray(queue) ? [...queue] : [];
			acknowledged =
				win.TiktokAnalyticsObject === 'ttq' && Array.isArray(queue);

			win.ttq = {
				grantConsent: () => {
					runtimeCalls.push('grantConsent');
				},
				page: () => {
					runtimeCalls.push('page');
				},
				revokeConsent: () => {
					runtimeCalls.push('revokeConsent');
				},
			};

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...tiktokPixel({ pixelId: 'TT-CONTRACT' }),
					id: 'tiktok-pixel-contract',
				},
			],
			grantedMarketingConsents
		);

		expect(acknowledged).toBe(true);
		expect(queueSnapshot).toEqual([['grantConsent'], ['page']]);
		expect(runtimeCalls).toEqual(['grantConsent']);
	});

	it('drains the pre-load queue into the vendor runtime after load', () => {
		const runtimeCalls: string[] = [];

		installHeadProbe((node, win) => {
			if (!node.src.includes('analytics.tiktok.com/i18n/pixel/events.js')) {
				return;
			}

			const queue = win.ttq;
			expect(Array.isArray(queue)).toBe(true);

			node.dispatchEvent(new Event('load'));

			const runtimeQueue: TikTokQueue = [] as unknown as TikTokQueue;
			runtimeQueue.push = Array.prototype.push;
			runtimeQueue.grantConsent = () => {
				runtimeCalls.push('grantConsent');
			};
			runtimeQueue.page = () => {
				runtimeCalls.push('page');
			};
			runtimeQueue.revokeConsent = () => {
				runtimeCalls.push('revokeConsent');
			};

			for (const queuedCall of Array.isArray(queue) ? [...queue] : []) {
				if (!Array.isArray(queuedCall)) {
					continue;
				}

				const [method, ...args] = queuedCall;
				const runtimeMethod =
					typeof method === 'string' ? runtimeQueue[method] : undefined;

				if (typeof runtimeMethod === 'function') {
					runtimeMethod(...args);
				}
			}

			win.ttq = runtimeQueue;
		});

		loadScripts(
			[
				{
					...tiktokPixel({ pixelId: 'TT-CONTRACT' }),
					id: 'tiktok-pixel-contract',
				},
			],
			grantedMarketingConsents
		);

		expect(runtimeCalls).toEqual(['grantConsent', 'page', 'grantConsent']);
	});
});
