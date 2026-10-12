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
import { pirsch } from './vendors/analytics/pirsch';

describe('pirsch contract', () => {
	registerVendorContractCleanup();

	it('gates loading on measurement consent and exposes loader attributes before append', () => {
		let appendCount = 0;
		let attributes: Record<string, string | boolean | null> | undefined;

		installHeadProbe((node) => {
			if (!node.src.includes('api.pirsch.io/pa.js')) {
				return;
			}

			appendCount += 1;
			attributes = {
				dataCode: node.getAttribute('data-code'),
				dataDev: node.getAttribute('data-dev'),
				dataDomain: node.getAttribute('data-domain'),
				dataEventEndpoint: node.getAttribute('data-event-endpoint'),
				dataHitEndpoint: node.getAttribute('data-hit-endpoint'),
				defer: node.defer,
				disablePageViews: node.hasAttribute('data-disable-page-views'),
				id: node.id,
			};
			node.dispatchEvent(new Event('load'));
		});

		const script = {
			...pirsch({
				dev: 'example.com',
				disablePageViews: true,
				domain: 'rollup.example.com:ROLLUP_CODE',
				eventEndpoint: 'https://analytics.example.com/event',
				hitEndpoint: 'https://analytics.example.com/hit',
				identificationCode: 'PIRSCH-CONTRACT',
			}),
			id: 'pirsch-contract',
		};

		loadScripts([script], deniedConsents);
		expect(appendCount).toBe(0);

		loadScripts([script], grantedMeasurementConsents);

		expect(appendCount).toBe(1);
		expect(attributes).toEqual({
			dataCode: 'PIRSCH-CONTRACT',
			dataDev: 'example.com',
			dataDomain: 'rollup.example.com:ROLLUP_CODE',
			dataEventEndpoint: 'https://analytics.example.com/event',
			dataHitEndpoint: 'https://analytics.example.com/hit',
			defer: true,
			disablePageViews: true,
			id: 'pianjs',
		});
	});
});
