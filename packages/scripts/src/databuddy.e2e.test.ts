/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import { databuddy } from './databuddy';
import {
	deniedConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	type TestWindow,
} from './e2e-test-utils';

describe('databuddy contract', () => {
	registerVendorContractCleanup();

	it('boots with denied defaults and then flips to granted on consent change', () => {
		const configWhenGranted = {
			clientId: 'db-contract',
			disabled: false,
			trackScreenViews: true,
		};
		const configWhenDenied = {
			clientId: 'db-contract',
			disabled: true,
		};
		let initialConfig: Record<string, unknown> | undefined;
		let attributes: Record<string, string | null> | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.databuddy.cc/databuddy.js')) {
				return;
			}

			initialConfig = { ...(win.databuddyConfig ?? {}) };
			attributes = {
				crossorigin: node.getAttribute('crossorigin'),
				clientId: node.getAttribute('data-client-id'),
				apiUrl: node.getAttribute('data-api-url'),
			};

			win.databuddy = {
				options: {},
			};

			node.dispatchEvent(new Event('load'));
		});

		const script = {
			...databuddy({
				clientId: 'db-contract',
				configWhenGranted,
				configWhenDenied,
			}),
			id: 'databuddy-contract',
		};

		loadScripts([script], deniedConsents);

		expect(initialConfig).toEqual(configWhenDenied);
		expect(attributes).toEqual({
			crossorigin: 'anonymous',
			clientId: 'db-contract',
			apiUrl: null,
		});
		expect((window as TestWindow).databuddy?.options.disabled).toBe(true);

		loadScripts([script], grantedMeasurementConsents);

		expect((window as TestWindow).databuddyConfig).toEqual(configWhenGranted);
		expect((window as TestWindow).databuddy?.options.disabled).toBe(false);
	});
});
