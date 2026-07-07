/**
 * Request lifecycle conformance suite.
 *
 * Verifies the consolidated v3 kernel/adapter rule that UI surfaces render
 * only from authoritative policy data. Provisional fallback policies may exist
 * in the store, but they must not produce banner DOM until init completes.
 */

import type { TestDriver } from '../driver';
import { conformanceTest, type SuiteApi } from './helpers';

const BANNER_ROOT = '[data-testid="consent-banner-root"]';

function hasBanner(root: ParentNode): boolean {
	return (
		root.querySelector(BANNER_ROOT) !== null ||
		(root instanceof HTMLElement
			? root.ownerDocument.body.querySelector(BANNER_ROOT) !== null
			: false)
	);
}

function countBannerOccurrences(html: string): number {
	return html.split('data-testid="consent-banner-root"').length - 1;
}

const ALL_CONSENTS_TRUE = {
	necessary: true,
	functionality: true,
	experience: true,
	measurement: true,
	marketing: true,
};

function storedConsentState() {
	return {
		consents: ALL_CONSENTS_TRUE,
		hasConsented: true,
		activeUI: 'none',
	};
}

export function runRequestLifecycleConformance(
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

		conformanceTest(api, 'failed init falls back to defaults', async () => {
			const mounted = await driver.mount({
				component: 'consent-banner',
				initMode: 'failing',
			});
			try {
				api.expect(hasBanner(mounted.root)).toBe(true);
				const state = driver.getStore().getState();
				api.expect(state.model).toBe('opt-in');
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
}
