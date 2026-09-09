import type { TestDriver } from '../driver';
import { POLICY_SCENARIOS } from '../fixtures/policy-scenarios';
import type { SuiteApi } from './helpers';
import { runPolicyScenarioConformance } from './policy-scenarios';

/** Run the shared persistence scenarios against real adapter observations. */
export const runPersistenceConformance = function runPersistenceConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	runPolicyScenarioConformance(
		driver,
		api,
		POLICY_SCENARIOS.filter(
			(scenario) =>
				scenario.storage !== undefined || scenario.covers.includes('F5')
		)
	);
};
