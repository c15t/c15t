/**
 * Request lifecycle conformance suite.
 *
 * Verifies the consolidated kernel/adapter rule that UI surfaces render
 * only from authoritative policy data. Provisional fallback policies may exist
 * in the store, but they must not produce banner DOM until init succeeds.
 */

import type { TestDriver } from '../driver';
import { conformanceTest } from './helpers';
import type { SuiteApi } from './helpers';

const BANNER_ROOT = '[data-testid="consent-banner-root"]';

const hasBanner = function hasBanner(root: ParentNode): boolean {
	return (
		root.querySelector(BANNER_ROOT) !== null ||
		(root instanceof HTMLElement
			? root.ownerDocument.body.querySelector(BANNER_ROOT) !== null
			: false)
	);
};

const countBannerOccurrences = function countBannerOccurrences(
	html: string
): number {
	return html.split('data-testid="consent-banner-root"').length - 1;
};

const ALL_CONSENTS_TRUE = {
	experience: true,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
};

const storedConsentState = function storedConsentState() {
	return {
		activeUI: 'none',
		consents: ALL_CONSENTS_TRUE,
		hasConsented: true,
	};
};

export const runRequestLifecycleConformance =
	function runRequestLifecycleConformance(
		driver: TestDriver,
		api: SuiteApi
	): void {
		api.describe(`[${driver.framework}] request lifecycle`, () => {
			conformanceTest(
				api,
				'no surface renders while init is unresolved',
				async () => {
					const mounted = await driver.mount({
						component: 'consent-banner',
						initMode: 'pending',
					});
					try {
						api.expect(hasBanner(mounted.root)).toBe(false);
						if (!mounted.resolveInit) {
							throw new Error(
								'driver did not expose resolveInit for initMode "pending"'
							);
						}
						await mounted.resolveInit();
						api.expect(hasBanner(mounted.root)).toBe(true);
					} finally {
						await mounted.unmount();
					}
				}
			);

			conformanceTest(
				api,
				'authoritative initial data renders immediately',
				async () => {
					const mounted = await driver.mount({
						component: 'consent-banner',
						initMode: 'authoritative',
					});
					try {
						api.expect(hasBanner(mounted.root)).toBe(true);
					} finally {
						await mounted.unmount();
					}
				}
			);

			conformanceTest(api, 'failed init withholds the banner', async () => {
				const mounted = await driver.mount({
					component: 'consent-banner',
					initMode: 'failing',
				});
				try {
					// Fail closed: a failed init must not promote the provisional
					// policy into a banner. The kernel retries in the background.
					api.expect(hasBanner(mounted.root)).toBe(false);
				} finally {
					await mounted.unmount();
				}
			});

			conformanceTest(
				api,
				'server render with stored consent omits the banner',
				async () => {
					const initialState = storedConsentState();
					const html = await driver.serverRender({
						component: 'consent-banner',
						initMode: 'authoritative',
						initialState,
					});
					api.expect(countBannerOccurrences(html)).toBe(0);

					const mounted = await driver.mount({
						component: 'consent-banner',
						initMode: 'authoritative',
						initialState,
					});
					try {
						api.expect(hasBanner(mounted.root)).toBe(false);
					} finally {
						await mounted.unmount();
					}
				}
			);
		});
	};
