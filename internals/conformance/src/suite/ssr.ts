/**
 * SSR conformance suite.
 *
 * Verifies that server-rendered HTML:
 * - Is non-empty.
 * - Normalizes to the same DOM structure as the client render
 *   (modulo framework hydration attrs, which `domSnapshot` strips).
 */

import { domSnapshot } from '../dom-snapshot';
import type { TestDriver } from '../driver';
import { conformanceTest, type SuiteApi } from './helpers';

function parseHtml(html: string): Element | null {
	const template = document.createElement('template');
	template.innerHTML = html.trim();
	return template.content.firstElementChild;
}

export function runSsrConformance(driver: TestDriver, api: SuiteApi): void {
	api.describe(`[${driver.framework}] ssr`, () => {
		conformanceTest(api, 'serverRender returns non-empty HTML', async () => {
			const html = await driver.serverRender({ component: 'consent-banner' });
			api.expect(typeof html).toBe('string');
			api.expect(html.length).toBeGreaterThan(0);
		});

		conformanceTest(api, 'server and client DOM snapshots match', async () => {
			const html = await driver.serverRender({ component: 'consent-banner' });
			const serverEl = parseHtml(html);
			api.expect(serverEl).not.toBeNull();
			if (!serverEl) return;
			const serverSnap = domSnapshot(serverEl);

			const mounted = await driver.mount({ component: 'consent-banner' });
			try {
				const clientChild = mounted.root.firstElementChild;
				if (!clientChild) throw new Error('client root has no children');
				const clientSnap = domSnapshot(clientChild);
				api.expect(clientSnap).toBe(serverSnap);
			} finally {
				await mounted.unmount();
			}
		});
	});
}
