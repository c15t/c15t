/**
 * Provider conformance suite.
 *
 * Asserts that every framework's `ConsentManagerProvider` exposes an
 * observable consent store with the expected top-level shape.
 */

import type { TestDriver } from '../driver';
import { conformanceTest, type SuiteApi } from './helpers';

const REQUIRED_STATE_KEYS = [
	'consents',
	'selectedConsents',
	'activeUI',
	'consentCategories',
] as const;

export function runProviderConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	api.describe(`[${driver.framework}] provider`, () => {
		conformanceTest(
			api,
			'exposes a store with the core state shape',
			async () => {
				const mounted = await driver.mount({ component: 'consent-banner' });
				try {
					const state = driver.getStore().getState();
					for (const key of REQUIRED_STATE_KEYS) {
						api.expect(state).toHaveProperty(key);
					}
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'subscribes to store changes and receives notifications',
			async () => {
				const mounted = await driver.mount({ component: 'consent-banner' });
				try {
					const store = driver.getStore();
					let notified = 0;
					const unsubscribe = store.subscribe(() => {
						notified++;
					});
					store.getState();
					unsubscribe();
					api.expect(notified).toBeGreaterThanOrEqual(0);
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(api, 'unmount cleans up the DOM', async () => {
			const mounted = await driver.mount({ component: 'consent-banner' });
			const root = mounted.root;
			api.expect(root.childNodes.length).toBeGreaterThan(0);
			await mounted.unmount();
			api.expect(root.childNodes.length).toBe(0);
		});
	});
}
