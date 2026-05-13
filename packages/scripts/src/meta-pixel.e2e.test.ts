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
import { metaPixel } from './meta-pixel';

describe('metaPixel contract', () => {
	registerVendorContractCleanup();

	it('boots with the vendor queue shape and startup calls intact', () => {
		let acknowledged = false;
		let queueSnapshot: unknown[] = [];

		installHeadProbe((node, win) => {
			if (!node.src.includes('connect.facebook.net/en_US/fbevents.js')) {
				return;
			}

			const fbq = win.fbq as
				| ((...args: unknown[]) => void)
				| (Record<string, unknown> & { queue?: unknown[]; push?: unknown });
			const queue = (fbq as { queue?: unknown[] }).queue ?? [];
			queueSnapshot = queue;
			acknowledged =
				win._fbq === win.fbq &&
				(fbq as { loaded?: boolean }).loaded === true &&
				(fbq as { version?: string }).version === '2.0' &&
				(fbq as { push?: unknown }).push === win.fbq &&
				queue.length === 3 &&
				queue.every(isArgumentsPayload) &&
				JSON.stringify(queue.map((entry) => toArgs(entry))) ===
					JSON.stringify([
						['consent', 'grant'],
						['init', 'META-CONTRACT'],
						['track', 'PageView'],
					]);

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...metaPixel({ pixelId: 'META-CONTRACT' }),
					id: 'meta-pixel-contract',
				},
			],
			grantedMarketingConsents
		);

		expect(acknowledged).toBe(true);
		expect(Array.isArray(queueSnapshot[0])).toBe(false);
	});
});
