/**
 * A banner in a left corner stays on the left in right-to-left copy.
 *
 * The root carries `dir="rtl"`, so any rule that places the card with
 * logical flex alignment would flip it to the right. This measures where
 * the card lands instead of reading `data-position`.
 */
import { clearBrowserConsentStorage } from '@c15t/conformance/suite';
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import type { ConsentClient } from '../types';
import { init, initIAB } from './fixtures/factory-init';

let client: ConsentClient | undefined;

afterEach(() => {
	client?.dispose();
	client = undefined;
	clearBrowserConsentStorage();
});

describe.each([
	{ create: init, iab: undefined, name: 'stock', testId: 'consent-banner' },
	{
		create: initIAB,
		iab: { cmpId: 28, gvl: completeGVL },
		name: 'IAB',
		testId: 'iab-consent-banner',
	},
])('the $name banner', ({ create, iab, testId }) => {
	it('stays at the bottom left for right-to-left text', async () => {
		await page.viewport(1280, 720);
		client = create({
			// Offline mode renders a language only when it has copy for it.
			i18n: { messages: { he: { cookieBanner: { title: 'פרטיות' } } } },
			iab,
			mode: 'offline',
			overrides: { country: 'DE', language: 'he' },
			ui: { disableAnimation: true },
		});
		await client.ready();
		await client.runtime.iab?.whenReady?.();
		const root = client.ui?.root;
		const banner = root?.querySelector(`[data-testid="${testId}-root"]`);
		const card = root?.querySelector(`[data-testid="${testId}-card"]`);
		if (!(banner && card)) {
			throw new Error('The banner did not mount');
		}
		expect(banner.getAttribute('dir')).toBe('rtl');
		const bounds = card.getBoundingClientRect();
		expect(bounds.left).toBeLessThan(window.innerWidth - bounds.right);
		expect(bounds.bottom).toBeGreaterThan(window.innerHeight / 2);
	});
});
