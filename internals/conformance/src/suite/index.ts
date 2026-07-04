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
import type { SuiteApi } from './helpers';
import { runI18nConformance } from './i18n';
import { runPoliciesConformance } from './policies';
import { runProviderConformance } from './provider';
import { runSsrConformance } from './ssr';
import { runStoreConformance } from './store';

export { runErrorConformance } from './errors';
export { runEventContractConformance } from './events';
export type { SuiteApi } from './helpers';
export { runI18nConformance } from './i18n';
export { runPoliciesConformance } from './policies';
export { runProviderConformance } from './provider';
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
}
