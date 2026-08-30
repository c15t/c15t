/**
 * Conformance entry point for @c15t/solid.
 *
 * The current Solid package exports styling/UI primitives only. It does not
 * expose `ConsentManagerProvider`, consent banner/dialog/widget components,
 * or a consent store. Keep this driver wired to the shared suite so the gap
 * is visible as conformance todos until the adapter surface exists.
 */

import {
	DriverNotImplementedError,
	runConformanceSuite,
} from '@c15t/conformance';
import type {
	MountOptions,
	MountResult,
	SuiteApi,
	TestDriver,
} from '@c15t/conformance';
import { describe, expect, test } from 'vitest';

const MISSING_ADAPTER_SURFACE =
	'@c15t/solid exports only primitives; missing ConsentManagerProvider, consent components, and store access';

const driver: TestDriver = {
	framework: 'solid',
	mount(_opts: MountOptions): Promise<MountResult> {
		throw new DriverNotImplementedError(
			'solid',
			`mount (${MISSING_ADAPTER_SURFACE})`
		);
	},
	getStore() {
		throw new DriverNotImplementedError(
			'solid',
			`getStore (${MISSING_ADAPTER_SURFACE})`
		);
	},
	serverRender(_opts: MountOptions): Promise<string> {
		throw new DriverNotImplementedError(
			'solid',
			`serverRender (${MISSING_ADAPTER_SURFACE})`
		);
	},
};

const api: SuiteApi = {
	describe,
	test,
	expect: expect as unknown as SuiteApi['expect'],
};

runConformanceSuite(driver, api);
