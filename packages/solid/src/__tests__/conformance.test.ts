/**
 * Stub conformance entry point for @c15t/solid.
 *
 * The Solid binding is a stub today — it re-exports UI primitives but does
 * not provide `ConsentManagerProvider` or mountable components. Once the
 * real binding ships, replace `DriverNotImplementedError` with a proper
 * mount/serverRender implementation; the conformance suite will then
 * flip from [todo] to green.
 */

import {
	DriverNotImplementedError,
	type MountOptions,
	type MountResult,
	runConformanceSuite,
	type SuiteApi,
	type TestDriver,
} from '@c15t/conformance';
import { describe, expect, test } from 'vitest';

const driver: TestDriver = {
	framework: 'solid',
	mount(_opts: MountOptions): Promise<MountResult> {
		throw new DriverNotImplementedError('solid', 'mount');
	},
	getStore() {
		return { getState: () => ({}), subscribe: () => () => {} };
	},
	serverRender(_opts: MountOptions): Promise<string> {
		throw new DriverNotImplementedError('solid', 'serverRender');
	},
};

const api: SuiteApi = {
	describe,
	test,
	expect: expect as unknown as SuiteApi['expect'],
};

runConformanceSuite(driver, api);
