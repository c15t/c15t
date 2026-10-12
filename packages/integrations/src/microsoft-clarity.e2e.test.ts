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
import { clarity } from './vendors/analytics/microsoft-clarity';

type ClarityStub = ((...args: unknown[]) => void) & {
	q?: unknown[][];
	v?: string;
};

describe('microsoft clarity contract', () => {
	registerVendorContractCleanup();

	it('queues Consent V2 before load without duplicate-install metadata', () => {
		let queueSnapshot: unknown[][] | undefined;
		let scriptSrc: string | undefined;
		let stubVersion: unknown;

		installHeadProbe((node, win) => {
			if (!node.src.includes('clarity.ms/tag/CLARITY-CONTRACT')) {
				return;
			}

			const clarityStub = win.clarity as ClarityStub | undefined;
			scriptSrc = node.src;
			stubVersion = clarityStub?.v;
			queueSnapshot = clarityStub?.q?.map((entry) => [...entry]);

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...clarity({ id: 'CLARITY-CONTRACT' }),
					id: 'microsoft-clarity-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(scriptSrc).toContain('/tag/CLARITY-CONTRACT');
		expect(stubVersion).toBeUndefined();
		expect(queueSnapshot).toEqual([
			[
				'consentv2',
				{
					ad_Storage: 'denied',
					analytics_Storage: 'granted',
				},
			],
		]);
	});
});
