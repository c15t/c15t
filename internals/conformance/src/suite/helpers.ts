/**
 * Shared helpers for conformance suites.
 *
 * The conformance package is agnostic to the test runner. Each per-framework
 * driver passes in a `SuiteApi` with `describe`, `test`, and `expect` from
 * the runner the package actually uses (vitest for framework packages,
 * bun:test for the meta-suite). Both runners expose compatible APIs.
 */

import { DriverNotImplementedError } from '../driver';
import type { TestDriver } from '../driver';

type DeferredPromise<Value> = {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
};

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers<Value>(): DeferredPromise<Value>;
};

function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
}

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

/**
 * Query by test-id in the mounted root, falling back to the document body.
 * Several frameworks portal surfaces (banner/dialog) to `document.body`, so
 * suites must not assume the element lives inside the mount container.
 */
export function queryByTestId(
	root: HTMLElement,
	testId: string
): HTMLElement | null {
	const selector = `[data-testid="${testId}"]`;
	return (
		root.querySelector<HTMLElement>(selector) ??
		root.ownerDocument.body.querySelector<HTMLElement>(selector)
	);
}

/**
 * Poll until `predicate` returns true or the deadline passes. Resolves with
 * the final predicate result so callers can make one last hard assertion
 * (which surfaces the actual mismatch instead of a generic timeout).
 */
export async function waitForCondition(
	predicate: () => boolean,
	timeoutMs = 2000,
	intervalMs = 10
): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		if (predicate()) return true;
		if (Date.now() >= deadline) return predicate();
		await createDeferredPromise((resolve) => setTimeout(resolve, intervalMs));
	}
}

/**
 * Clear the browser storage surfaces the consent runtimes persist to
 * (localStorage + cookies). No-ops outside a DOM environment. Suites that
 * exercise persistence call this at the start and end of each test so
 * state cannot leak between tests or drivers sharing a page.
 */
export function clearBrowserConsentStorage(): void {
	if (typeof document === 'undefined') return;
	try {
		globalThis.localStorage?.clear();
	} catch {
		// Storage may be unavailable (SSR-ish env) — nothing to clear.
	}
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
		}
	}
}
