/**
 * Vendor-level consent through the Astro integration: the `vendors` option
 * reaches the page runtime, the dialog islands list a switch per vendor,
 * the page client reads vendor consent, and inert tags wait on their
 * vendor.
 */

import type { Vendor } from '@c15t/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { activateGatedScripts } from '../browser/inline-scripts';
import { boot } from '../client';
import type { AstroConsentClient } from '../client';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import type { C15tAstroOptions } from '../types';
import { registerDialogAdapter, registerDialogSurface } from '../ui/adapter';
import { reactDialogAdapter } from '../ui/react';
import { vueDialogAdapter } from '../ui/vue';
import { testResolution, testRule } from './policy-fixture';

const VENDORS: Vendor[] = [
	{
		category: 'measurement',
		id: 'posthog',
		name: 'PostHog',
		privacyPolicyUrl: 'https://posthog.com/privacy',
	},
	{
		category: 'measurement',
		id: 'youtube',
		name: 'YouTube',
		privacyPolicyUrl: 'https://policies.google.com/privacy',
	},
];

const OPTIONS: C15tAstroOptions = {
	consentCategories: ['necessary', 'measurement'],
	mode: offlineMode({ policyRules: [testRule] }),
	reloadOnConsentRevoked: false,
	vendors: VENDORS,
};

const cleanup: (() => Promise<void> | void)[] = [];

// jsdom has no `matchMedia`; the React surface reads reduced motion from it.
beforeAll(() => {
	window.matchMedia ??= (query: string) =>
		({
			addEventListener: () => undefined,
			addListener: () => undefined,
			dispatchEvent: () => false,
			matches: false,
			media: query,
			onchange: null,
			removeEventListener: () => undefined,
			removeListener: () => undefined,
		}) as MediaQueryList;
});

afterEach(async () => {
	for (const step of cleanup.splice(0).reverse()) {
		// oxlint-disable-next-line no-await-in-loop -- Tear down in reverse mount order.
		await step();
	}
	(window as unknown as Record<string, unknown>).__c15tAstroConfig = undefined;
	document.body.innerHTML = '';
	localStorage.clear();
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
});

const start = function start(
	options: C15tAstroOptions = OPTIONS,
	{ resolved = true } = {}
): AstroConsentClient {
	if (resolved) {
		// The server resolved the policy, as it does for a rendered page.
		(window as unknown as Record<string, unknown>).__c15tAstroConfig = {
			initialPolicyResolution: testResolution(),
		};
	}
	const client = boot(resolveOptions(options));
	cleanup.push(() => {
		client.dispose();
		document.getElementById('c15t-dialog-host')?.remove();
	});
	return client;
};

const byTestId = (testId: string): HTMLElement | null =>
	document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

describe('the vendors option', () => {
	it('survives the serialized options the browser boots from', () => {
		const resolved = resolveOptions(OPTIONS);
		expect(JSON.parse(JSON.stringify(resolved)).vendors).toEqual(VENDORS);
	});

	it('declares the vendors on the page runtime', () => {
		const client = start();
		expect(
			client.runtime.kernel
				.getSnapshot()
				.vendors?.declared.map((vendor) => vendor.id)
				.toSorted()
		).toEqual(['posthog', 'youtube']);
	});
});

describe('reading vendor consent from the page client', () => {
	it('reports declared vendors, the recorded choice and each vendor gate', async () => {
		const client = start();
		expect(
			client
				.getDeclaredVendors()
				.map((vendor) => vendor.id)
				.toSorted()
		).toEqual(['posthog', 'youtube']);
		expect(client.getVendorChoice()).toBeNull();
		expect(client.isVendorAllowed('posthog')).toBe(false);

		await client.save({ measurement: true, vendors: { posthog: false } });

		expect(client.getVendorChoice()?.denied).toEqual(['posthog']);
		expect(client.isVendorAllowed('posthog')).toBe(false);
		expect(client.isVendorAllowed('youtube')).toBe(true);
		// Nothing is known about an undeclared vendor, so nothing denies it.
		expect(client.isVendorAllowed('unknown-vendor')).toBe(true);

		await client.acceptAll();
		expect(client.getVendorChoice()?.denied).toEqual([]);
		expect(client.isVendorAllowed('posthog')).toBe(true);
	});
});

describe('inert tags with data-c15t-vendor', () => {
	it('waits on the vendor as well as the category', async () => {
		const client = start();
		await client.save({ measurement: true, vendors: { posthog: false } });
		document.body.innerHTML = [
			'<script type="text/plain" data-c15t-category="measurement" data-c15t-vendor="posthog">1</script>',
			'<script type="text/plain" data-c15t-category="measurement" data-c15t-vendor="youtube">2</script>',
		].join('');

		expect(activateGatedScripts(client.getConsent())).toBe(1);
		const posthog = document.querySelector(
			'script[data-c15t-vendor="posthog"]'
		);
		expect(posthog?.getAttribute('type')).toBe('text/plain');
		expect(posthog?.hasAttribute('data-c15t-activated')).toBe(false);

		await client.save({ measurement: true, vendors: { posthog: true } });
		await vi.waitFor(() =>
			expect(
				document
					.querySelector('script[data-c15t-vendor="posthog"]')
					?.getAttribute('data-c15t-activated')
			).toBe('true')
		);
	});
});

const openDialog = async function openDialog(
	ui: 'react' | 'vue'
): Promise<AstroConsentClient> {
	const host = document.createElement('div');
	host.setAttribute('data-c15t-dialog-host', 'preferences');
	document.body.append(host);
	cleanup.push(() => host.remove());
	if (ui === 'react') {
		registerDialogAdapter('react', () => Promise.resolve(reactDialogAdapter));
		registerDialogSurface(
			'react',
			() => import('../components/islands/panel-surface')
		);
	} else {
		registerDialogAdapter('vue', () => Promise.resolve(vueDialogAdapter));
		registerDialogSurface(
			'vue',
			() => import('../components/islands/panel-surface.vue')
		);
	}
	// The dialog waits for the browser to resolve the policy itself.
	const client = start({ ...OPTIONS, ui }, { resolved: false });
	await client.openDialog();
	// The category's content, vendor list included, mounts once expanded.
	// The first open imports the framework and the island.
	await vi.waitFor(
		() =>
			expect(
				byTestId('consent-widget-accordion-trigger-measurement')
			).not.toBeNull(),
		{ timeout: 10_000 }
	);
	byTestId('consent-widget-accordion-trigger-measurement')?.click();
	await vi.waitFor(() =>
		expect(byTestId('consent-widget-vendor-list-measurement')).not.toBeNull()
	);
	return client;
};

describe.each(['react', 'vue'] as const)('the %s dialog island', (ui) => {
	it(
		'lists the vendors with a switch that records a denial on Save',
		{
			timeout: 20_000,
		},
		async () => {
			const client = await openDialog(ui);
			const vendorSwitch = () =>
				byTestId('consent-widget-vendor-switch-measurement-posthog');
			expect(vendorSwitch()?.getAttribute('aria-label')).toBe('Allow PostHog');
			// Off while the category is off in the draft.
			expect(vendorSwitch()?.hasAttribute('disabled')).toBe(true);

			byTestId('consent-widget-switch-measurement')?.click();
			await vi.waitFor(() =>
				expect(vendorSwitch()?.hasAttribute('disabled')).toBe(false)
			);
			vendorSwitch()?.click();
			await vi.waitFor(() =>
				expect(vendorSwitch()?.getAttribute('aria-checked')).toBe('false')
			);
			byTestId('consent-widget-footer-save-button')?.click();

			await vi.waitFor(() =>
				expect(client.getVendorChoice()?.denied).toEqual(['posthog'])
			);
			expect(client.isVendorAllowed('youtube')).toBe(true);
		}
	);
});
