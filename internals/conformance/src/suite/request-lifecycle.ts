import { NO_POLICY_HIDDEN_ROOTS } from '../contract/dom-contract';
import type { TestDriver } from '../driver';
import { POLICY_SCENARIOS } from '../fixtures/policy-scenarios';
import { conformanceTest, queryByTestId, waitForCondition } from './helpers';
import type { SuiteApi } from './helpers';
import { runPolicyScenarioConformance } from './policy-scenarios';

/** Pending visibility remains a real deferred-transport mount test. */
export const runInitVisibilityConformance =
	function runInitVisibilityConformance(
		driver: TestDriver,
		api: SuiteApi
	): void {
		api.describe(`[${driver.framework}] initial policy visibility`, () => {
			conformanceTest(
				api,
				'no surface renders while init is unresolved',
				async () => {
					const mounted = await driver.mount({
						component: 'consent-banner',
						initMode: 'pending',
					});
					try {
						api
							.expect(queryByTestId(mounted.root, 'consent-banner-root'))
							.toBe(null);
						if (!mounted.resolveInit) {
							throw new Error('Missing deferred transport resolveInit');
						}
						await mounted.resolveInit();
						api
							.expect(queryByTestId(mounted.root, 'consent-banner-root'))
							.not.toBeNull();
					} finally {
						await mounted.unmount();
					}
				}
			);
			for (const component of ['consent-dialog', 'consent-widget'] as const) {
				conformanceTest(
					api,
					`${component} renders no consent surface without a resolved policy`,
					async () => {
						const mounted = await driver.mount({
							component,
							initMode: 'pending',
						});
						try {
							// No policy, no consent UI: none of the surface roots exist,
							// even for surfaces the host has asked to open.
							for (const testId of NO_POLICY_HIDDEN_ROOTS) {
								api
									.expect(queryByTestId(mounted.root, testId), testId)
									.toBe(null);
							}
							if (!mounted.resolveInit) {
								throw new Error('Missing deferred transport resolveInit');
							}
							await mounted.resolveInit();
							// The widget appears once the policy arrives, without a remount.
							// The dialog is not asserted here: the arriving policy owes a
							// prompt, so the kernel re-derives the surface to the banner and
							// discards the pre-policy request to open the dialog.
							if (component === 'consent-widget') {
								// Framework boundaries apply a resolved init a tick or two
								// after the transport answers, so poll before asserting.
								await waitForCondition(
									() =>
										queryByTestId(mounted.root, 'consent-widget-root') !== null,
									5000
								);
								api
									.expect(
										queryByTestId(mounted.root, 'consent-widget-root'),
										'consent-widget-root'
									)
									.not.toBeNull();
							}
						} finally {
							await mounted.unmount();
						}
					}
				);
			}
			conformanceTest(
				api,
				'authoritative initial data renders immediately',
				async () => {
					const mounted = await driver.mount({
						component: 'consent-banner',
						initMode: 'authoritative',
					});
					try {
						api
							.expect(queryByTestId(mounted.root, 'consent-banner-root'))
							.not.toBeNull();
					} finally {
						await mounted.unmount();
					}
				}
			);
		});
	};

/** Run the shared request-lifecycle scenarios against real adapter observations. */
export const runRequestLifecycleConformance =
	function runRequestLifecycleConformance(
		driver: TestDriver,
		api: SuiteApi
	): void {
		runInitVisibilityConformance(driver, api);
		runPolicyScenarioConformance(
			driver,
			api,
			POLICY_SCENARIOS.filter((scenario) => scenario.covers.includes('F7'))
		);
	};
