import type { TestDriver } from '../driver';
import { POLICY_SCENARIOS } from '../fixtures/policy-scenarios';
import { conformanceTest, queryByTestId } from './helpers';
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
