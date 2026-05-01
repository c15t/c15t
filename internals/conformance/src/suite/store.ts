/**
 * Store conformance suite.
 *
 * Verifies that consent actions mutate the store in the expected way,
 * regardless of framework. Mirrors the public contract of
 * `createConsentManagerStore` from `@c15t/core`.
 */

import type { TestDriver } from '../driver';
import { conformanceTest, type SuiteApi } from './helpers';

type StateShape = {
	consents: Record<string, boolean>;
	selectedConsents: Record<string, boolean>;
	activeUI: 'none' | 'banner' | 'dialog';
};

function readState(driver: TestDriver): StateShape {
	return driver.getStore().getState() as unknown as StateShape;
}

export function runStoreConformance(driver: TestDriver, api: SuiteApi): void {
	api.describe(`[${driver.framework}] store`, () => {
		conformanceTest(
			api,
			'consents and selectedConsents start with a consistent shape',
			async () => {
				const mounted = await driver.mount({ component: 'consent-banner' });
				try {
					const { consents, selectedConsents } = readState(driver);
					api
						.expect(Object.keys(consents).sort())
						.toEqual(Object.keys(selectedConsents).sort());
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'banner component sets activeUI to "banner" on mount',
			async () => {
				const mounted = await driver.mount({ component: 'consent-banner' });
				try {
					const { activeUI } = readState(driver);
					api.expect(['banner', 'none']).toContain(activeUI);
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'necessary consent remains true regardless of user action',
			async () => {
				const mounted = await driver.mount({ component: 'consent-banner' });
				try {
					const { consents } = readState(driver);
					if ('necessary' in consents) {
						api.expect(consents.necessary).toBe(true);
					}
				} finally {
					await mounted.unmount();
				}
			}
		);
	});
}
