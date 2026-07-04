/**
 * Shared helpers for conformance suites.
 *
 * The conformance package is agnostic to the test runner. Each per-framework
 * driver passes in a `SuiteApi` with `describe`, `test`, and `expect` from
 * the runner the package actually uses (vitest for framework packages,
 * bun:test for the meta-suite). Both runners expose compatible APIs.
 */

import { DriverNotImplementedError, type TestDriver } from '../driver';

export type TestFn = (name: string, body: () => void | Promise<void>) => void;

export type DescribeFn = (name: string, body: () => void) => void;

export type ExpectFn = (value: unknown) => {
	toBe(value: unknown): void;
	toEqual(value: unknown): void;
	toContain(value: unknown): void;
	toHaveProperty(key: string): void;
	toBeGreaterThan(value: number): void;
	toBeGreaterThanOrEqual(value: number): void;
	toBeDefined(): void;
	not: {
		toBeNull(): void;
		toThrow(): void;
	};
};

export type SuiteApi = {
	describe: DescribeFn;
	test: TestFn;
	expect: ExpectFn;
};

/**
 * Register a conformance test. Runs the body; if the driver signals
 * "not implemented", the test is marked as todo (visible in output)
 * but does not fail the suite.
 */
export function conformanceTest(
	api: SuiteApi,
	name: string,
	body: () => void | Promise<void>
): void {
	api.test(name, async () => {
		try {
			await body();
		} catch (err) {
			if (err instanceof DriverNotImplementedError) {
				console.warn(`  [todo] ${name}: ${err.message}`);
				return;
			}
			throw err;
		}
	});
}

export type SuiteContext = {
	driver: TestDriver;
	api: SuiteApi;
};
