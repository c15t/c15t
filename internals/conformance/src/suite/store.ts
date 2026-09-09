import type { TestDriver } from '../driver';
import { POLICY_SCENARIOS } from '../fixtures/policy-scenarios';
import type { SuiteApi } from './helpers';
import { runPolicyScenarioConformance } from './policy-scenarios';

/** Run the shared store scenarios against real adapter observations. */
export const runStoreConformance = function runStoreConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	runPolicyScenarioConformance(
		driver,
		api,
		POLICY_SCENARIOS.filter(
			(scenario) =>
				scenario.covers.includes('F2') ||
				scenario.covers.includes('F5') ||
				scenario.covers.includes('F6')
		)
	);
};
