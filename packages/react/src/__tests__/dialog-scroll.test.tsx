/**
 * The stock dialog caps its card at the viewport and scrolls the category
 * list. An expanded category with vendor cards must make that list
 * overflow and scroll, even when the app styles the list or its items with
 * `overflow: hidden`, a common way to clip them to rounded corners. App CSS
 * sits outside c15t's cascade layer, so it beats c15t's normal rules.
 */
import '@c15t/ui/styles.css';
import type { Vendor } from '@c15t/core';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { ConsentDialog } from '../aggregate-components';
import { ConsentProvider } from '../provider';
import { offline } from '../transports/offline';
import { policyFixture } from './policy-fixture';

const VENDORS: Vendor[] = Array.from({ length: 8 }, (_, index) => ({
	category: 'marketing',
	id: `vendor-${index}`,
	name: `Vendor ${index}`,
	privacyPolicyUrl: 'https://example.com/privacy',
}));

let appStyle: HTMLStyleElement | undefined;

afterEach(async () => {
	appStyle?.remove();
	appStyle = undefined;
	await page.viewport(414, 896);
});

test.each([
	['no app CSS', ''],
	[
		'app CSS hiding the list overflow',
		'[data-testid="consent-widget-accordion"] { overflow: hidden; }',
	],
	[
		'app CSS hiding each item overflow',
		'[data-testid^="consent-widget-accordion-item-"] { overflow: hidden; }',
	],
])('an expanded category scrolls the list with %s', async (_label, css) => {
	appStyle = document.createElement('style');
	appStyle.textContent = css;
	document.head.append(appStyle);
	await page.viewport(375, 600);

	const screen = await render(
		<ConsentProvider
			options={{
				consentCategories: ['necessary', 'measurement', 'marketing'],
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(
					{ marketing: true },
					{
						categories: ['measurement', 'marketing'],
						id: 'dialog-scroll',
						model: 'opt-in',
						prompt: 'choice',
					}
				),
				vendors: VENDORS,
			}}
		>
			<ConsentDialog
				disableAnimation
				open
			/>
		</ConsentProvider>
	);

	await screen
		.getByTestId('consent-widget-accordion-trigger-marketing')
		.click();
	await expect
		.element(screen.getByTestId('consent-widget-vendor-list-marketing'))
		.toBeVisible();

	const list = document.querySelector<HTMLElement>(
		'[data-testid="consent-widget-accordion"]'
	);
	const item = document.querySelector<HTMLElement>(
		'[data-testid="consent-widget-accordion-item-marketing"]'
	);
	const vendors = document.querySelector<HTMLElement>(
		'[data-testid="consent-widget-vendor-list-marketing"]'
	);
	expect(list).not.toBeNull();
	expect(item).not.toBeNull();
	expect(vendors).not.toBeNull();
	if (!list || !item || !vendors) {
		return;
	}

	// Once its expand transition ends, the category keeps the full height
	// of its vendor cards instead of being shrunk to fit the list.
	await vi.waitFor(() => {
		expect(item.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(
			vendors.getBoundingClientRect().bottom
		);
	});
	// The list overflows and stays a box the visitor can scroll.
	expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
	expect(getComputedStyle(list).overflowY).toBe('auto');
});
