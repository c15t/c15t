/**
 * Persistence conformance suite.
 *
 * A true write -> read round-trip through each framework's public
 * persistence path: mount with persistence enabled, accept consent via the
 * rendered banner (the user-facing action, which routes through the
 * runtime's save + storage write), unmount, mount a completely fresh
 * instance, and verify the stored decision was restored — no banner, saved
 * consents present.
 *
 * This complements the request-lifecycle suite: that one covers "pre-seeded
 * stored consent omits the banner" via driver `initialState`; this one
 * exercises the storage write itself.
 *
 * Storage is cleared at the start and end of every test so drivers sharing
 * a page/environment cannot leak state into each other.
 */

import type { TestDriver } from '../driver';
import {
	clearBrowserConsentStorage,
	conformanceTest,
	queryByTestId,
	waitForCondition,
} from './helpers';
import type { SuiteApi } from './helpers';

const BANNER_ROOT = 'consent-banner-root';
const ACCEPT_BUTTON = 'consent-banner-accept-button';

type PersistedState = {
	consents?: Record<string, boolean>;
	hasConsented?: unknown;
};

function readState(driver: TestDriver): PersistedState {
	return driver.getStore().getState() as PersistedState;
}

export function runPersistenceConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	api.describe(`[${driver.framework}] persistence`, () => {
		conformanceTest(
			api,
			'consent accepted through the banner is restored by a fresh mount',
			async () => {
				clearBrowserConsentStorage();
				try {
					// -- First instance: user accepts through the rendered banner.
					const first = await driver.mount({
						component: 'consent-banner',
						persistence: true,
					});
					try {
						api.expect(queryByTestId(first.root, BANNER_ROOT)).not.toBeNull();
						// Pre-consent under an opt-in policy: optional categories denied.
						api.expect(readState(driver).consents?.marketing).toBe(false);

						const accept = queryByTestId(first.root, ACCEPT_BUTTON);
						if (!accept) {
							throw new Error(
								'persistence suite: accept button not found in mounted banner'
							);
						}
						accept.click();

						const saved = await waitForCondition(
							() => readState(driver).consents?.marketing === true
						);
						api.expect(saved).toBe(true);
						// The banner dismisses after the decision is recorded.
						await waitForCondition(
							() => queryByTestId(first.root, BANNER_ROOT) === null
						);
					} finally {
						await first.unmount();
					}

					// -- Fresh instance: decision must come back from storage alone.
					const second = await driver.mount({
						component: 'consent-banner',
						persistence: true,
					});
					try {
						api.expect(queryByTestId(second.root, BANNER_ROOT)).toBe(null);
						const state = readState(driver);
						api.expect(state.consents?.necessary).toBe(true);
						api.expect(state.consents?.marketing).toBe(true);
						api.expect(state.consents?.measurement).toBe(true);
						if (typeof state.hasConsented === 'boolean') {
							api.expect(state.hasConsented).toBe(true);
						}
					} finally {
						await second.unmount();
					}
				} finally {
					clearBrowserConsentStorage();
				}
			}
		);

		conformanceTest(
			api,
			'fresh mount with empty storage shows the banner and no prior decision',
			async () => {
				clearBrowserConsentStorage();
				const mounted = await driver.mount({
					component: 'consent-banner',
					persistence: true,
				});
				try {
					api.expect(queryByTestId(mounted.root, BANNER_ROOT)).not.toBeNull();
					api.expect(readState(driver).consents?.marketing).toBe(false);
				} finally {
					await mounted.unmount();
					clearBrowserConsentStorage();
				}
			}
		);
	});
}
