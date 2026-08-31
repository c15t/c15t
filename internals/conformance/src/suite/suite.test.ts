/**
 * Meta-test: a minimal stub driver exercises the suite factories so we
 * catch regressions in the runner wiring, not just the framework drivers.
 *
 * Framework packages pass in vitest's API; this file uses bun:test's API.
 * Both are compatible — this test proves it.
 */

import { describe, expect, test } from 'bun:test';

import { DriverNotImplementedError } from '../driver';
import type { MountOptions, MountResult, TestDriver } from '../driver';
import { runConformanceSuite } from './index';
import type { SuiteApi } from './index';

const driver: TestDriver = {
	framework: 'vue',
	getStore() {
		return { getState: () => ({}), subscribe: () => () => {} };
	},
	mount(_opts: MountOptions): Promise<MountResult> {
		throw new DriverNotImplementedError('vue', 'mount');
	},
	serverRender(_opts: MountOptions): Promise<string> {
		throw new DriverNotImplementedError('vue', 'serverRender');
	},
};

const api: SuiteApi = {
	describe,
	expect: expect as unknown as SuiteApi['expect'],
	test,
};

runConformanceSuite(driver, api);
