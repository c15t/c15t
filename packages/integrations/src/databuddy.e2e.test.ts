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
	updateScripts,
} from './e2e-test-utils';
import type { TestWindow } from './e2e-test-utils';
import { databuddy } from './vendors/analytics/databuddy';

const isDatabuddyLoader = function isDatabuddyLoader(
	node: HTMLScriptElement
): boolean {
	return node.src.includes('cdn.databuddy.cc/databuddy.js');
};

describe('databuddy contract', () => {
	registerVendorContractCleanup();

	it('loads nothing until measurement consent is granted', () => {
		let loads = 0;
		installHeadProbe((node) => {
			if (isDatabuddyLoader(node)) {
				loads += 1;
			}
		});

		const script = databuddy({ clientId: 'db-contract' });

		expect(loadScripts([script], deniedConsents)).toEqual([]);
		expect(loads).toBe(0);
		expect((window as TestWindow).databuddyConfig).toBeUndefined();
	});

	it('loads on grant, disables the tracker on refusal and loads again with the granted config', () => {
		const configWhenGranted = {
			clientId: 'db-contract',
			disabled: false,
			trackScreenViews: true,
		};
		const configAtLoad: unknown[] = [];
		let attributes: Record<string, string | null> | undefined;

		installHeadProbe((node, win) => {
			if (!isDatabuddyLoader(node)) {
				return;
			}

			configAtLoad.push({ ...(win.databuddyConfig ?? {}) });
			attributes = {
				apiUrl: node.getAttribute('data-api-url'),
				clientId: node.getAttribute('data-client-id'),
				crossorigin: node.getAttribute('crossorigin'),
				trackInteractions: node.getAttribute('data-track-interactions'),
				trackWebVitals: node.getAttribute('data-track-web-vitals'),
			};

			win.databuddy = {
				options: {},
			};

			node.dispatchEvent(new Event('load'));
		});

		const script = databuddy({
			clientId: 'db-contract',
			configWhenDenied: { clientId: 'db-contract', disabled: true },
			configWhenGranted,
			features: { interactions: false },
		});

		loadScripts([script], grantedMeasurementConsents);

		const win = window as TestWindow;
		expect(attributes).toEqual({
			apiUrl: 'https://basket.databuddy.cc',
			clientId: 'db-contract',
			crossorigin: 'anonymous',
			trackInteractions: 'false',
			trackWebVitals: null,
		});
		expect(win.databuddyConfig).toEqual(configWhenGranted);
		expect(win.databuddy?.options.disabled).toBe(false);

		updateScripts([script], deniedConsents);

		expect(win.databuddy?.options.disabled).toBe(true);

		updateScripts([script], grantedMeasurementConsents);

		// The script a later grant loads starts with the granted config.
		expect(configAtLoad).toEqual([configWhenGranted, configWhenGranted]);
		expect(win.databuddy?.options.disabled).toBe(false);
		expect(win.databuddyConfig).toEqual(configWhenGranted);
	});

	it('disables the config when consent is refused while databuddy.js downloads', () => {
		const configAtLoad: unknown[] = [];
		installHeadProbe((node, win) => {
			if (isDatabuddyLoader(node)) {
				// Never fire `load`: the download is still in flight.
				configAtLoad.push({ ...(win.databuddyConfig ?? {}) });
			}
		});

		const script = databuddy({
			clientId: 'db-contract',
			configWhenGranted: { clientId: 'db-contract', trackScreenViews: true },
		});

		loadScripts([script], grantedMeasurementConsents);
		updateScripts([script], deniedConsents);

		// databuddy.js can still run after its <script> is removed, and it reads
		// this config when it does.
		const win = window as TestWindow;
		expect(win.databuddyConfig).toEqual({
			clientId: 'db-contract',
			disabled: true,
			trackScreenViews: true,
		});

		updateScripts([script], grantedMeasurementConsents);

		expect(configAtLoad).toEqual([
			{ clientId: 'db-contract', disabled: false, trackScreenViews: true },
			{ clientId: 'db-contract', disabled: false, trackScreenViews: true },
		]);
	});

	it('boots with denied defaults when always loaded and then flips to granted', () => {
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

		installHeadProbe((node, win) => {
			if (!isDatabuddyLoader(node)) {
				return;
			}

			initialConfig = { ...(win.databuddyConfig ?? {}) };

			win.databuddy = {
				options: {},
			};

			node.dispatchEvent(new Event('load'));
		});

		const script = {
			...databuddy({
				clientId: 'db-contract',
				configWhenDenied,
				configWhenGranted,
				loadMode: 'always',
			}),
			id: 'databuddy-contract',
		};

		loadScripts([script], deniedConsents);

		const win = window as TestWindow;
		expect(initialConfig).toEqual(configWhenDenied);
		expect(win.databuddy?.options.disabled).toBe(true);

		loadScripts([script], grantedMeasurementConsents);

		expect(win.databuddyConfig).toEqual(configWhenGranted);
		expect(win.databuddy?.options.disabled).toBe(false);
	});
});
