/**
 * Cross-framework conformance suites.
 *
 * Each per-framework test file constructs a `TestDriver` and passes it
 * into `runConformanceSuite(driver, api)`. The `api` carries the
 * runner-specific `describe`/`test`/`expect` so suites stay agnostic.
 */

import type { TestDriver } from '../driver';
import { runErrorConformance } from './errors';
import { runEventContractConformance } from './events';
import { runGpcConformance } from './gpc';
import type { SuiteApi } from './helpers';
import { runI18nConformance } from './i18n';
import { runIabConformance } from './iab';
import { runPersistenceConformance } from './persistence';
import { runPoliciesConformance } from './policies';
import { runProviderConformance } from './provider';
import { runRequestLifecycleConformance } from './request-lifecycle';
import { runSsrConformance } from './ssr';
import { runStoreConformance } from './store';

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
export { runProviderConformance } from './provider';
export { runRequestLifecycleConformance } from './request-lifecycle';
export { runSsrConformance } from './ssr';
export { runStoreConformance } from './store';

export function runConformanceSuite(driver: TestDriver, api: SuiteApi): void {
	runProviderConformance(driver, api);
	runStoreConformance(driver, api);
	runI18nConformance(driver, api);
	runPoliciesConformance(driver, api);
	runEventContractConformance(driver, api);
	runErrorConformance(driver, api);
	runSsrConformance(driver, api);
	runRequestLifecycleConformance(driver, api);
	runGpcConformance(driver, api);
	runPersistenceConformance(driver, api);
	runIabConformance(driver, api);
}
