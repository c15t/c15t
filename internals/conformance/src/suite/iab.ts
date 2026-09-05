/**
 * IAB TCF conformance suite (render + store level).
 *
 * Mounts the prebuilt IAB surfaces with an IAB policy fixture and a minimal
 * GVL (see `fixtures/gvl.ts`) and asserts the canonical contract render:
 * the banner root and customize button test-ids, basic button semantics,
 * and that the store reports the IAB policy model.
 *
 * Deliberately shallow: no vendor/purpose toggling or deep dialog
 * interaction — portal + focus-trap behavior is flaky under jsdom and is
 * covered by the storybook interaction suites instead. Drivers without IAB
 * component support throw `DriverNotImplementedError` and fail.
 */

import { TEST_IDS } from '../contract/test-ids';
import type { TestDriver } from '../driver';
import { POLICY_SCENARIOS } from '../fixtures/policy-scenarios';
import { conformanceTest, queryByTestId, waitForCondition } from './helpers';
import type { SuiteApi } from './helpers';
import { runPolicyScenarioConformance } from './policy-scenarios';

const accessibleName = function accessibleName(el: HTMLElement): string {
	return (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
};

export const runIabUiConformance = function runIabUiConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	api.describe(`[${driver.framework}] iab`, () => {
		conformanceTest(
			api,
			'IAB banner renders the contract root and customize button',
			async () => {
				const mounted = await driver.mount({
					component: 'iab-consent-banner',
				});
				try {
					await waitForCondition(
						() =>
							queryByTestId(mounted.root, TEST_IDS.iabConsentBanner.root) !==
							null
					);
					const root = queryByTestId(
						mounted.root,
						TEST_IDS.iabConsentBanner.root
					);
					api.expect(root).not.toBeNull();

					const customize = queryByTestId(
						mounted.root,
						TEST_IDS.iabConsentBanner.customizeButton
					);
					api.expect(customize).not.toBeNull();
					if (customize) {
						const isButton =
							customize.tagName === 'BUTTON' ||
							customize.getAttribute('role') === 'button';
						api.expect(isButton).toBe(true);
						api.expect(accessibleName(customize).length).toBeGreaterThan(0);
					}
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'IAB banner mount reports the iab policy model in the store',
			async () => {
				const mounted = await driver.mount({
					component: 'iab-consent-banner',
				});
				try {
					await waitForCondition(
						() => driver.getStore().getState().model === 'iab'
					);
					api.expect(driver.getStore().getState().model).toBe('iab');
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'IAB dialog renders the contract root when mounted open',
			async () => {
				const mounted = await driver.mount({
					component: 'iab-consent-dialog',
				});
				try {
					await waitForCondition(
						() =>
							queryByTestId(mounted.root, TEST_IDS.iabConsentDialog.root) !==
							null
					);
					api
						.expect(queryByTestId(mounted.root, TEST_IDS.iabConsentDialog.root))
						.not.toBeNull();
				} finally {
					await mounted.unmount();
				}
			}
		);
	});
};

/** Category restrictions and confirmed IAB authority remain independent. */
export const runIabConformance = function runIabConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	runIabUiConformance(driver, api);
	runPolicyScenarioConformance(
		driver,
		api,
		POLICY_SCENARIOS.filter((scenario) => scenario.covers.includes('F11'))
	);
};
