/**
 * Meta-test: a minimal stub driver exercises the suite factories so we
 * catch regressions in the runner wiring, not just the framework drivers.
 *
 * Framework packages pass in vitest's API; this file uses bun:test's API.
 * Both are compatible — this test proves it.
 */

import { describe, expect, test } from 'bun:test';
import {
	DriverNotImplementedError,
	type MountOptions,
	type MountResult,
	type TestDriver,
} from '../driver';
import { runConformanceSuite, type SuiteApi } from './index';

const driver: TestDriver = {
	framework: 'vue',
	mount(_opts: MountOptions): Promise<MountResult> {
		throw new DriverNotImplementedError('vue', 'mount');
	},
	getStore() {
		return { getState: () => ({}), subscribe: () => () => {} };
	},
	serverRender(_opts: MountOptions): Promise<string> {
		throw new DriverNotImplementedError('vue', 'serverRender');
	},
};

const api: SuiteApi = {
	describe,
	test,
	expect: expect as unknown as SuiteApi['expect'],
};

runConformanceSuite(driver, api);
