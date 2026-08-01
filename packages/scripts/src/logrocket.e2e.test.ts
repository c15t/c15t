/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import {
	deniedConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { logRocket } from './vendors/analytics/logrocket';

describe('logRocket contract', () => {
	registerVendorContractCleanup();

	it('gates loading on measurement consent, initializes after load, and unloads on revoke', () => {
		let appendCount = 0;
		let crossoriginAttribute: string | null | undefined;
		let initBeforeLoad = false;
		const init = vi.fn();

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.logrocket.io/LogRocket.min.js')) {
				return;
			}

			appendCount += 1;
			crossoriginAttribute = node.getAttribute('crossorigin');
			win.LogRocket = {
				init,
			};
			initBeforeLoad = init.mock.calls.length > 0;
			node.dispatchEvent(new Event('load'));
		});

		const script = {
			...logRocket({
				appId: 'c15tfake/c15tfake',
				initOptions: {
					dom: {
						inputSanitizer: true,
					},
				},
			}),
			id: 'logrocket-contract',
			anonymizeId: false,
		};

		loadScripts([script], deniedConsents);
		expect(appendCount).toBe(0);

		loadScripts([script], grantedMeasurementConsents);

		expect(appendCount).toBe(1);
		expect(crossoriginAttribute).toBe('anonymous');
		expect(initBeforeLoad).toBe(false);
		expect(init).toHaveBeenCalledWith('c15tfake/c15tfake', {
			dom: {
				inputSanitizer: true,
			},
		});
		expect(
			document.getElementById('c15t-script-logrocket-contract')
		).toBeInstanceOf(HTMLScriptElement);

		const result = updateScripts([script], deniedConsents);

		expect(result.unloaded).toEqual(['logrocket-contract']);
		expect(
			document.getElementById('c15t-script-logrocket-contract')
		).toBeNull();
	});
});
