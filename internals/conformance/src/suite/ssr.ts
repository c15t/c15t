import type { TestDriver } from '../driver';
import { POLICY_SCENARIOS } from '../fixtures/policy-scenarios';
import type { SuiteApi } from './helpers';
import { runPolicyScenarioConformance } from './policy-scenarios';

/** Run the shared ssr scenarios against real adapter observations. */
export const runSsrConformance = function runSsrConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	runPolicyScenarioConformance(
		driver,
		api,
		POLICY_SCENARIOS.filter((scenario) => scenario.covers.includes('F9'))
	);
};
