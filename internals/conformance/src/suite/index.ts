/**
 * Cross-framework conformance suites.
 *
 * Each per-framework test file constructs a `TestDriver` and passes it
 * into `runConformanceSuite(driver, api)`. The `api` carries the
 * runner-specific `describe`/`test`/`expect` so suites stay agnostic.
 */

import type { TestDriver } from '../driver';
import { runA11yConformance } from './a11y';
import { runErrorConformance } from './errors';
import type { SuiteApi } from './helpers';
import { runI18nConformance } from './i18n';
import { runIabUiConformance } from './iab';
import { runPoliciesConformance } from './policies';
import { runPolicyScenarioConformance } from './policy-scenarios';
import { runProviderConformance } from './provider';
import { runInitVisibilityConformance } from './request-lifecycle';

export { runA11yConformance } from './a11y';
export { runErrorConformance } from './errors';
export { runEventContractConformance } from './events';
export { runGpcConformance } from './gpc';
export {
	clearBrowserConsentStorage,
	queryByTestId,
	type SuiteApi,
	waitForCondition,
} from './helpers';
export { runI18nConformance } from './i18n';
export { runIabConformance } from './iab';
export { runPersistenceConformance } from './persistence';
export { runPoliciesConformance } from './policies';
export { runPolicyProducerConformance } from './policy-producers';
export { runProviderConformance } from './provider';
export { runRequestLifecycleConformance } from './request-lifecycle';
export { runSsrConformance } from './ssr';
export { runStoreConformance } from './store';

export const runConformanceSuite = function runConformanceSuite(
	driver: TestDriver,
	api: SuiteApi
): void {
	if (driver.framework === 'solid') {
		api.test('[solid] primitives-only: consent adapter excluded', () => {
			api.expect(driver.framework).toBe('solid');
		});
		return;
	}
	runPolicyScenarioConformance(driver, api);
	runInitVisibilityConformance(driver, api);
	runProviderConformance(driver, api);
	runI18nConformance(driver, api);
	runPoliciesConformance(driver, api);
	runErrorConformance(driver, api);
	runA11yConformance(driver, api);
	runIabUiConformance(driver, api);
};

export {
	runPolicyScenarioConformance,
	executePolicyScenario,
	assertPolicyObservation,
	policySessionSetup,
} from './policy-scenarios';
