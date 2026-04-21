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
			if (Array.isArray(queue)) {
				queueSnapshot = [...queue];
			} else {
				queueSnapshot = [];
			}
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

			let queuedCalls: unknown[] = [];
			if (Array.isArray(queue)) {
				queuedCalls = [...queue];
			} else {
				queuedCalls = [];
			}

			const runtimeQueue: TikTokQueue = [] as unknown as TikTokQueue;
			runtimeQueue.grantConsent = () => {
				runtimeCalls.push('grantConsent');
			};
			runtimeQueue.page = () => {
				runtimeCalls.push('page');
			};
			runtimeQueue.revokeConsent = () => {
				runtimeCalls.push('revokeConsent');
			};

			win.ttq = runtimeQueue;

			for (const queuedCall of queuedCalls) {
				if (!Array.isArray(queuedCall)) {
					continue;
				}

				const [method, ...args] = queuedCall;
				let runtimeMethod: unknown;
				if (typeof method === 'string') {
					runtimeMethod = runtimeQueue[method];
				} else {
					runtimeMethod = undefined;
				}

				if (typeof runtimeMethod === 'function') {
					runtimeMethod(...args);
				}
			}

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

		expect(runtimeCalls).toEqual(['grantConsent', 'page', 'grantConsent']);
	});
});
