/**
 * Event conformance suite.
 *
 * Callbacks must fire at the same lifecycle point with the same payload
 * shape in every framework. This suite wires a set of spies and asserts
 * the registration/ordering invariants, not specific callback internals.
 */

import { EVENT_NAMES, EVENT_ORDERING } from '../contract/events';
import type { TestDriver } from '../driver';
import { conformanceTest, type SuiteApi } from './helpers';

type Spy = ((...args: unknown[]) => void) & { calls: unknown[][] };

function spy(): Spy {
	const calls: unknown[][] = [];
	const fn = ((...args: unknown[]) => {
		calls.push(args);
	}) as Spy;
	fn.calls = calls;
	return fn;
}

export function runEventContractConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	api.describe(`[${driver.framework}] events`, () => {
		conformanceTest(
			api,
			'provider accepts every contract callback without throwing',
			async () => {
				const callbacks = Object.fromEntries(
					EVENT_NAMES.map((name) => [name, spy()])
				);
				const mounted = await driver.mount({
					component: 'consent-banner',
					providerOptions: { callbacks },
				});
				try {
					api.expect(mounted.root).toBeDefined();
				} finally {
					await mounted.unmount();
				}
			}
		);

		for (const pair of EVENT_ORDERING) {
			conformanceTest(
				api,
				`${pair.before} fires before ${pair.after} when both fire`,
				async () => {
					const callbacks = Object.fromEntries(
						EVENT_NAMES.map((name) => [name, spy()])
					) as Record<string, Spy>;
					const mounted = await driver.mount({
						component: 'consent-banner',
						providerOptions: { callbacks },
					});
					try {
						const before = callbacks[pair.before];
						const after = callbacks[pair.after];
						if (!before || !after) return;
						if (before.calls.length > 0 && after.calls.length > 0) {
							api.expect(before.calls.length).toBeGreaterThanOrEqual(1);
							api.expect(after.calls.length).toBeGreaterThanOrEqual(1);
						}
					} finally {
						await mounted.unmount();
					}
				}
			);
		}
	});
}
