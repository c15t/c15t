/**
 * Global Privacy Control conformance suite.
 *
 * Codifies the framework-observable GPC contract implemented by core:
 *
 * - v2: `computeAutoGrantInfo` in
 *   `packages/core/src/libs/init-consent-manager/store-updater.ts` — under
 *   an opt-out model with no prior consent, an active GPC signal flips the
 *   tracking categories (`marketing`, `measurement`) to denied while the
 *   remaining optional categories stay auto-granted. The signal is only
 *   honored when the active policy sets `consent.gpc: true` (or no policy
 *   is configured at all).
 * - v3: `applyModelDefaultsForNoConsent` in
 *   `packages/core/src/v3/policy.ts` — identical semantics driven by
 *   `overrides.gpc` + `policy.consent.gpc` + `policy.model === 'opt-out'`.
 *
 * Derived from core's unit tests (do not invent behavior here):
 * - `packages/core/src/libs/init-consent-manager/__tests__/store-updater.test.ts`
 *   ("updateStore - GPC override")
 * - `packages/core/src/v3/kernel/__tests__/snapshot.test.ts`
 *   ("fresh opt-out policy grants optional consents except GPC tracking
 *   categories")
 *
 * Notably: under an opt-in model the optional categories default to denied
 * with or without GPC — the signal adds nothing on top of opt-in defaults,
 * and it never overrides an explicit stored decision.
 */

import type { TestDriver } from '../driver';
import { conformanceTest, waitForCondition } from './helpers';
import type { SuiteApi } from './helpers';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
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
};

type ConsentSnapshot = Record<string, boolean>;

const readConsents = function readConsents(
	driver: TestDriver
): ConsentSnapshot {
	const state = driver.getStore().getState() as {
		consents?: ConsentSnapshot;
	};
	return state.consents ?? {};
};

/** Wait until the driver's store reports the expected category values. */
const settleConsents = async function settleConsents(
	driver: TestDriver,
	expected: ConsentSnapshot
): Promise<void> {
	await waitForCondition(() => {
		const consents = readConsents(driver);
		return Object.entries(expected).every(
			([category, value]) => consents[category] === value
		);
	});
};

const OPT_OUT_GPC_POLICY = { model: 'opt-out', respectGpc: true } as const;

export const runGpcConformance = function runGpcConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	api.describe(`[${driver.framework}] gpc`, () => {
		conformanceTest(
			api,
			'opt-out policy without GPC auto-grants optional categories',
			async () => {
				const mounted = await driver.mount({
					component: 'consent-banner',
					policy: OPT_OUT_GPC_POLICY,
				});
				try {
					const expected = {
						experience: true,
						functionality: true,
						marketing: true,
						measurement: true,
						necessary: true,
					};
					await settleConsents(driver, expected);
					const consents = readConsents(driver);
					for (const [category, value] of Object.entries(expected)) {
						api.expect(consents[category]).toBe(value);
					}
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'GPC signal denies marketing and measurement under an opt-out policy',
			async () => {
				const mounted = await driver.mount({
					component: 'consent-banner',
					gpc: true,
					policy: OPT_OUT_GPC_POLICY,
				});
				try {
					const expected = {
						experience: true,
						functionality: true,
						marketing: false,
						measurement: false,
						necessary: true,
					};
					await settleConsents(driver, expected);
					const consents = readConsents(driver);
					for (const [category, value] of Object.entries(expected)) {
						api.expect(consents[category]).toBe(value);
					}
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'GPC adds nothing on top of opt-in defaults (optional categories stay denied)',
			async () => {
				const mounted = await driver.mount({
					component: 'consent-banner',
					gpc: true,
					policy: { model: 'opt-in', respectGpc: true },
				});
				try {
					const expected = {
						experience: false,
						functionality: false,
						marketing: false,
						measurement: false,
						necessary: true,
					};
					await settleConsents(driver, expected);
					const consents = readConsents(driver);
					for (const [category, value] of Object.entries(expected)) {
						api.expect(consents[category]).toBe(value);
					}
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'GPC does not override an explicit stored consent decision',
			async () => {
				const mounted = await driver.mount({
					component: 'consent-banner',
					gpc: true,
					initialState: {
						activeUI: 'none',
						consents: {
							experience: true,
							functionality: true,
							marketing: true,
							measurement: true,
							necessary: true,
						},
						hasConsented: true,
					},
					policy: OPT_OUT_GPC_POLICY,
				});
				try {
					// The stored decision is correct at mount time — the risk is a
					// late init/policy fold flipping it. Give the runtime a moment
					// to finish settling before asserting the decision survived.
					await createDeferredPromise((resolve) => setTimeout(resolve, 50));
					const consents = readConsents(driver);
					api.expect(consents.marketing).toBe(true);
					api.expect(consents.measurement).toBe(true);
				} finally {
					await mounted.unmount();
				}
			}
		);
	});
};
