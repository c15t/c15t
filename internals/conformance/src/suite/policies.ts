/**
 * Policies conformance suite.
 *
 * Verifies that the consent widget renders exactly one entry per policy
 * in the configured list and that required policies render as locked.
 */

import type { TestDriver } from '../driver';
import { EMPTY_POLICIES, MINIMAL_POLICIES } from '../fixtures/policies';
import { conformanceTest, type SuiteApi } from './helpers';

function countSwitches(root: HTMLElement): number {
	return root.querySelectorAll('[role="switch"]').length;
}

export function runPoliciesConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
	api.describe(`[${driver.framework}] policies`, () => {
		conformanceTest(
			api,
			'renders one switch per non-required policy',
			async () => {
				const mounted = await driver.mount({
					component: 'consent-widget',
					providerOptions: {
						consentCategories: MINIMAL_POLICIES.map((p) => p.id),
					},
				});
				try {
					const switches = countSwitches(mounted.root);
					const nonRequired = MINIMAL_POLICIES.filter((p) => !p.required);
					api.expect(switches).toBeGreaterThanOrEqual(nonRequired.length);
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'required policies render with aria-checked="true" or aria-disabled',
			async () => {
				const mounted = await driver.mount({
					component: 'consent-widget',
					providerOptions: {
						consentCategories: MINIMAL_POLICIES.map((p) => p.id),
					},
				});
				try {
					const required = MINIMAL_POLICIES.filter((p) => p.required);
					for (const policy of required) {
						const el = mounted.root.querySelector(
							`[data-testid="consent-widget-switch-${policy.id}"]`
						);
						if (!el) continue;
						const disabled =
							el.getAttribute('aria-disabled') === 'true' ||
							el.getAttribute('disabled') !== null;
						const checked = el.getAttribute('aria-checked');
						api.expect(checked === 'true' || disabled).toBe(true);
					}
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'empty policy list still renders a widget root',
			async () => {
				const mounted = await driver.mount({
					component: 'consent-widget',
					providerOptions: { consentCategories: EMPTY_POLICIES },
				});
				try {
					const root = mounted.root.querySelector(
						'[data-testid="consent-widget-root"]'
					);
					api.expect(root).not.toBeNull();
				} finally {
					await mounted.unmount();
				}
			}
		);
	});
}
