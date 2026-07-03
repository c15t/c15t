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
import { plausibleAnalytics } from './vendors/analytics/plausible-analytics';

type PlausibleStub = ((...args: unknown[]) => void) & {
	o?: Record<string, unknown>;
	q?: unknown[][];
};

describe('plausible analytics contract', () => {
	registerVendorContractCleanup();

	it('exposes init options and data attributes before the loader appends', () => {
		let attributes: Record<string, string | boolean | null> | undefined;
		let initOptions: Record<string, unknown> | undefined;
		let queueSnapshot: unknown[][] | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('plausible.io/js/script.js')) {
				return;
			}

			const plausible = win.plausible as PlausibleStub | undefined;
			plausible?.('Signup', { props: { plan: 'pro' } });

			attributes = {
				dataApi: node.getAttribute('data-api'),
				dataDomain: node.getAttribute('data-domain'),
				defer: node.defer,
			};
			initOptions = plausible?.o;
			queueSnapshot = plausible?.q?.map((entry) => [...entry]);

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...plausibleAnalytics({
						autoCapturePageviews: false,
						customProperties: { release: 'canary' },
						domain: 'example.com',
						endpoint: 'https://analytics.example.com/api/event',
					}),
					id: 'plausible-analytics-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(attributes).toEqual({
			dataApi: 'https://analytics.example.com/api/event',
			dataDomain: 'example.com',
			defer: true,
		});
		expect(initOptions).toEqual({
			autoCapturePageviews: false,
			customProperties: { release: 'canary' },
			endpoint: 'https://analytics.example.com/api/event',
		});
		expect(queueSnapshot).toEqual([['Signup', { props: { plan: 'pro' } }]]);
	});
});
