/**
 * IAB TCF conformance suite (render + store level).
 *
 * Mounts the prebuilt IAB surfaces with an IAB policy fixture and a minimal
 * GVL (see `fixtures/gvl.ts`) and asserts the canonical contract render:
 * the banner root and customize button test-ids, basic button semantics,
 * and that the store reports the IAB policy model.
 *
 * Deliberately shallow: no vendor/purpose toggling or deep dialog
 * interaction — portal + focus-trap behavior is flaky under jsdom and is
 * covered by the storybook interaction suites instead. Drivers without IAB
 * component support throw `DriverNotImplementedError` and fail.
 */

import { TEST_IDS } from '../contract/test-ids';
import type { TestDriver } from '../driver';
import { POLICY_SCENARIOS } from '../fixtures/policy-scenarios';
import {
	conformanceTest,
	queryByTestId,
	queryAllIncludingShadowRoots,
	waitForCondition,
} from './helpers';
import type { SuiteApi } from './helpers';
import { runPolicyScenarioConformance } from './policy-scenarios';

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

/** The test-id namespaces a row in the consent list can carry. */
const CONSENT_ROW_PREFIXES = [
	'purpose-item-',
	'stack-item-',
	'special-feature-item-',
];

/** Every `data-testid` on or under an element, in document order. */
const testIdsWithin = function testIdsWithin(
	root: ParentNode,
	prefix: string
): string[] {
	return queryAllIncludingShadowRoots(root, '[data-testid]')
		.map((element) => element.getAttribute('data-testid') ?? '')
		.filter(
			(id) =>
				id.startsWith(prefix) &&
				/^(?:purpose|stack|special-feature|special-purpose|feature)-item-\d+$/u.test(
					id
				)
		);
};

const accessibleName = function accessibleName(el: HTMLElement): string {
	return (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
};

export const runIabUiConformance = function runIabUiConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	api.describe(`[${driver.framework}] iab`, () => {
		for (const surface of ['banner', 'dialog'] as const) {
			for (const blocking of [false, true]) {
				conformanceTest(
					api,
					`IAB ${surface} honors blocking=${blocking} over legacy focus settings`,
					async () => {
						const originalOverflow = document.body.style.overflow;
						const mounted = await driver.mount({
							component:
								surface === 'banner'
									? 'iab-consent-banner'
									: 'iab-consent-dialog',
							providerOptions: {
								disableAnimation: true,
								presentation: {
									preferences: { blocking },
									prompt: { blocking },
								},
								trapFocus: !blocking,
							},
						});
						try {
							const card = () =>
								queryByTestId(document.body, `iab-consent-${surface}-card`);
							await waitForCondition(() => card() !== null);
							api
								.expect(card()?.getAttribute('role'))
								.toBe(surface === 'dialog' || blocking ? 'dialog' : 'region');
							api
								.expect(card()?.getAttribute('aria-modal'))
								.toBe(blocking ? 'true' : null);
							api
								.expect(
									queryByTestId(
										document.body,
										`iab-consent-${surface}-overlay`
									) !== null
								)
								.toBe(blocking);
							api
								.expect(document.body.style.overflow)
								.toBe(blocking ? 'hidden' : originalOverflow);
						} finally {
							await mounted.unmount();
						}
						api.expect(document.body.style.overflow).toBe(originalOverflow);
					}
				);
			}
		}
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
					// Document order, across every kind the consent list can hold,
					// so the assertion covers the order and not just membership.
					const rows = testIdsWithin(document.body, '').filter((id) =>
						CONSENT_ROW_PREFIXES.some((prefix) => id.startsWith(prefix))
					);
					api.expect(rows).toEqual(EXPECTED_CONSENT_ROWS);
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
			'IAB dialog gives locked essential rows no consent controls',
			async () => {
				const mounted = await driver.mount({
					component: 'iab-consent-dialog',
				});
				try {
					await waitForCondition(
						() => testIdsWithin(document.body, 'purpose-item-').length > 0
					);
					// Frameworks may unmount collapsed content or use native details.
					// Either way, essential disclosures must never offer consent.
					const controls = queryAllIncludingShadowRoots(
						document.body,
						'[data-testid^="special-purpose-item-"] [role="switch"], [data-testid^="feature-item-"] [role="switch"], [data-testid^="special-purpose-item-"] [role="checkbox"], [data-testid^="feature-item-"] [role="checkbox"], [data-testid^="special-purpose-item-"] input, [data-testid^="feature-item-"] input'
					);
					api.expect(controls.length).toBe(0);
				} finally {
					await mounted.unmount();
				}
			}
		);
	});
};

/** Category restrictions and confirmed IAB authority remain independent. */
export const runIabConformance = function runIabConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	runIabUiConformance(driver, api);
	runPolicyScenarioConformance(
		driver,
		api,
		POLICY_SCENARIOS.filter((scenario) => scenario.covers.includes('F11'))
	);
};
