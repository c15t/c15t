/**
 * IAB TCF conformance suite (render + store level).
 *
 * Mounts the prebuilt IAB surfaces with an IAB policy fixture and a minimal
 * GVL (see `fixtures/gvl.ts`) and asserts the canonical contract render:
 * the banner root and customize button test-ids, basic button semantics,
 * and that the store reports the IAB policy model.
 *
 * Deliberately shallow on interaction: no vendor/purpose toggling: portal
 * and focus-trap behavior is flaky under jsdom and is covered by the
 * storybook interaction suites instead. What it does assert deeply is the
 * shared display model — which rows each surface lists, and under which
 * test-id — because that is the contract the four adapters have to agree
 * on and the one they used to derive four different ways. Drivers without
 * IAB component support throw `DriverNotImplementedError` and degrade to
 * todo.
 */

import { TEST_IDS } from '../contract/test-ids';
import type { TestDriver } from '../driver';
import { conformanceTest, queryByTestId, waitForCondition } from './helpers';
import type { SuiteApi } from './helpers';

/**
 * The rows `MINIMAL_GVL` produces, in render order.
 *
 * Purpose 1 is standalone by the TCF spec and purpose 2 is the only one
 * the fixture's stack covers, so the stack does not qualify and both
 * purposes stand alone. The vendor declares the special feature, so that
 * row renders too.
 */
const EXPECTED_CONSENT_ROWS = [
	'purpose-item-1',
	'purpose-item-2',
	'special-feature-item-1',
];

/** Every `data-testid` on or under an element, in document order. */
const testIdsWithin = function testIdsWithin(
	root: ParentNode,
	prefix: string
): string[] {
	return Array.from(root.querySelectorAll('[data-testid]'))
		.map((element) => element.getAttribute('data-testid') ?? '')
		.filter((id) => id.startsWith(prefix));
};

const accessibleName = function accessibleName(el: HTMLElement): string {
	return (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
};

export const runIabConformance = function runIabConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	api.describe(`[${driver.framework}] iab`, () => {
		conformanceTest(
			api,
			'IAB banner renders the contract root and customize button',
			async () => {
				const mounted = await driver.mount({
					component: 'iab-consent-banner',
				});
				try {
					await waitForCondition(
						() =>
							queryByTestId(mounted.root, TEST_IDS.iabConsentBanner.root) !==
							null
					);
					const root = queryByTestId(
						mounted.root,
						TEST_IDS.iabConsentBanner.root
					);
					api.expect(root).not.toBeNull();

					const customize = queryByTestId(
						mounted.root,
						TEST_IDS.iabConsentBanner.customizeButton
					);
					api.expect(customize).not.toBeNull();
					if (customize) {
						const isButton =
							customize.tagName === 'BUTTON' ||
							customize.getAttribute('role') === 'button';
						api.expect(isButton).toBe(true);
						api.expect(accessibleName(customize).length).toBeGreaterThan(0);
					}
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'IAB banner mount reports the iab policy model in the store',
			async () => {
				const mounted = await driver.mount({
					component: 'iab-consent-banner',
				});
				try {
					await waitForCondition(
						() => driver.getStore().getState().model === 'iab'
					);
					api.expect(driver.getStore().getState().model).toBe('iab');
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'IAB dialog renders the contract root when mounted open',
			async () => {
				const mounted = await driver.mount({
					component: 'iab-consent-dialog',
				});
				try {
					await waitForCondition(
						() =>
							queryByTestId(mounted.root, TEST_IDS.iabConsentDialog.root) !==
							null
					);
					api
						.expect(queryByTestId(mounted.root, TEST_IDS.iabConsentDialog.root))
						.not.toBeNull();
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'IAB dialog lists the shared display model’s rows, in its order',
			async () => {
				const mounted = await driver.mount({
					component: 'iab-consent-dialog',
				});
				try {
					await waitForCondition(
						() => testIdsWithin(document.body, 'purpose-item-').length > 0
					);
					const rows = testIdsWithin(document.body, 'purpose-item-').concat(
						testIdsWithin(document.body, 'special-feature-item-')
					);
					for (const expected of EXPECTED_CONSENT_ROWS) {
						api.expect(rows).toContain(expected);
					}
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'IAB dialog gives each row a test-id no other row shares',
			async () => {
				const mounted = await driver.mount({
					component: 'iab-consent-dialog',
				});
				try {
					await waitForCondition(
						() => testIdsWithin(document.body, 'purpose-item-').length > 0
					);
					// The display model namespaces a row's test-id by kind
					// precisely so counting them means something: a purpose, a
					// special purpose, a feature and a special feature can all be
					// numbered `1`.
					const rows = [
						...testIdsWithin(document.body, 'purpose-item-'),
						...testIdsWithin(document.body, 'special-purpose-item-'),
						...testIdsWithin(document.body, 'special-feature-item-'),
						...testIdsWithin(document.body, 'feature-item-'),
						...testIdsWithin(document.body, 'stack-item-'),
					];
					api.expect(new Set(rows).size).toBe(rows.length);
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'IAB dialog keeps the locked essential rows out of the consent list',
			async () => {
				const mounted = await driver.mount({
					component: 'iab-consent-dialog',
				});
				try {
					await waitForCondition(
						() => testIdsWithin(document.body, 'purpose-item-').length > 0
					);
					// Special purposes and features have no consent to give, so
					// they live behind the collapsed "essential functions"
					// section rather than among the toggles.
					api
						.expect(
							testIdsWithin(document.body, 'special-purpose-item-').length
						)
						.toBe(0);
				} finally {
					await mounted.unmount();
				}
			}
		);
	});
};
