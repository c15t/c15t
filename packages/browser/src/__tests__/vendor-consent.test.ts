import { policyRulePresets } from '@c15t/core';
import type { Vendor } from '@c15t/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
import { activateGatedScripts } from '../gated-scripts';
import { createGlobal } from '../global';
import type { ConsentClient, ConsentUIHandle } from '../types';
import { mountConsentUI } from '../ui/mount';

const vendors: Vendor[] = [
	{
		category: 'measurement',
		description: 'Product analytics.',
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
	{
		category: 'marketing',
		id: 'x-pixel',
		name: 'X Pixel',
		privacyPolicyUrl: 'https://x.com/en/privacy',
	},
];

const clients: ConsentClient[] = [];

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

const baseOptions = {
	consentCategories: ['measurement', 'marketing'],
	policyRules: [
		{
			...policyRulePresets.europeOptIn(),
			categories: ['measurement', 'marketing'],
			match: { isDefault: true },
			scopeMode: 'strict',
		},
	],
	vendors,
} satisfies Parameters<typeof createConsentClient>[0];

const start = async function start(
	options: Parameters<typeof createConsentClient>[0] = {}
): Promise<ConsentClient> {
	const client = createConsentClient(
		{
			...baseOptions,
			ui: { disableAnimation: true, styles: false },
			...options,
		},
		{ mountUI: mountConsentUI, pkg: '@c15t/browser/test' }
	);
	clients.push(client);
	client.start();
	await client.ready();
	return client;
};

const query = function query<ElementType extends HTMLElement = HTMLElement>(
	root: ParentNode,
	testId: string
): ElementType {
	const element = root.querySelector<ElementType>(`[data-testid="${testId}"]`);
	if (!element) {
		throw new Error(`missing ${testId}`);
	}
	return element;
};

const inertScript = function inertScript(
	category: string,
	vendor: string | null,
	body: string
): HTMLScriptElement {
	const script = document.createElement('script');
	script.type = 'text/plain';
	script.setAttribute('data-c15t-category', category);
	if (vendor) {
		script.setAttribute('data-c15t-vendor', vendor);
	}
	script.textContent = body;
	document.body.append(script);
	return script;
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	clearCookies();
	document.body.replaceChildren();
	document.head.querySelector('#c15t-styles')?.remove();
	vi.restoreAllMocks();
});

describe('vendor switches in the preference centre', () => {
	it('lists each category vendor with a switch that is off until the category is on', async () => {
		const client = await start();
		const { root } = client.ui as ConsentUIHandle;
		client.openDialog();

		const list = query(root, 'consent-widget-vendor-list-measurement');
		expect(list.getAttribute('aria-label')).toBe('Vendors (2)');
		expect(
			query(root, 'consent-widget-vendor-name-measurement-posthog').textContent
		).toBe('PostHog');
		expect(
			root.querySelector(
				'[data-testid="consent-widget-vendor-item-measurement-x-pixel"]'
			)
		).toBeNull();
		query(root, 'consent-widget-vendor-item-marketing-x-pixel');

		const posthog = query<HTMLButtonElement>(
			root,
			'consent-widget-vendor-switch-measurement-posthog'
		);
		expect(posthog.getAttribute('role')).toBe('switch');
		expect(posthog.getAttribute('aria-label')).toBe('Allow PostHog');
		expect(posthog.getAttribute('aria-checked')).toBe('true');
		expect(posthog.disabled).toBe(true);
		query(root, 'consent-widget-vendor-hint-measurement');

		query(root, 'consent-widget-switch-measurement').click();
		expect(posthog.disabled).toBe(false);
		expect(
			root.querySelector(
				'[data-testid="consent-widget-vendor-hint-measurement"]'
			)
		).toBeNull();
	});

	it('records a vendor turned off on Save and keeps it off when the dialog reopens', async () => {
		const client = await start();
		const { root } = client.ui as ConsentUIHandle;
		client.openDialog();
		query(root, 'consent-widget-switch-measurement').click();
		const posthog = query(
			root,
			'consent-widget-vendor-switch-measurement-posthog'
		);
		posthog.click();
		expect(posthog.getAttribute('aria-checked')).toBe('false');
		// A draft is not a decision yet.
		expect(client.getVendorChoice()).toBeNull();

		query(root, 'consent-widget-footer-save-button').click();
		await vi.waitFor(() => expect(client.getSnapshot().activeUI).toBe('none'));
		expect(client.has('measurement')).toBe(true);
		expect(client.getVendorChoice()?.denied).toEqual(['posthog']);
		expect(client.isVendorAllowed('posthog')).toBe(false);
		expect(client.isVendorAllowed('youtube')).toBe(true);
		expect(client.isVendorAllowed('x-pixel')).toBe(false);

		client.openDialog();
		expect(
			query(
				root,
				'consent-widget-vendor-switch-measurement-posthog'
			).getAttribute('aria-checked')
		).toBe('false');
	});

	it('drops an unsaved vendor toggle when the dialog closes', async () => {
		const client = await start();
		const { root } = client.ui as ConsentUIHandle;
		client.openDialog();
		query(root, 'consent-widget-switch-measurement').click();
		query(root, 'consent-widget-vendor-switch-measurement-posthog').click();
		client.closeDialog();
		client.openDialog();
		expect(
			query(
				root,
				'consent-widget-vendor-switch-measurement-posthog'
			).getAttribute('aria-checked')
		).toBe('true');
	});

	it('clears a vendor denial on Accept all and Reject all', async () => {
		const client = await start();
		const { root } = client.ui as ConsentUIHandle;
		await client.save({ measurement: true, vendors: { posthog: false } });
		expect(client.getVendorChoice()?.denied).toEqual(['posthog']);

		client.openDialog();
		query(root, 'consent-widget-footer-accept-all-button').click();
		await vi.waitFor(() =>
			expect(client.getVendorChoice()?.denied).toEqual([])
		);
		expect(client.isVendorAllowed('posthog')).toBe(true);

		await client.save({ measurement: true, vendors: { posthog: false } });
		client.openDialog();
		// A staged vendor switch does not survive a bulk action either.
		query(root, 'consent-widget-vendor-switch-measurement-youtube').click();
		query(root, 'consent-widget-reject-button').click();
		await vi.waitFor(() =>
			expect(client.getVendorChoice()?.denied).toEqual([])
		);
		client.openDialog();
		expect(
			query(
				root,
				'consent-widget-vendor-switch-measurement-youtube'
			).getAttribute('aria-checked')
		).toBe('true');
	});

	it('lists a disabled vendor without a switch', async () => {
		const client = await start({
			vendors: [{ ...vendors[0], disabled: true } as Vendor],
		});
		const { root } = client.ui as ConsentUIHandle;
		client.openDialog();
		query(root, 'consent-widget-vendor-item-measurement-posthog');
		expect(
			root.querySelector(
				'[data-testid="consent-widget-vendor-switch-measurement-posthog"]'
			)
		).toBeNull();
	});

	it('expands a vendor card for its description and privacy policy', async () => {
		const client = await start();
		const { root } = client.ui as ConsentUIHandle;
		client.openDialog();
		const trigger = query(
			root,
			'consent-widget-vendor-trigger-measurement-posthog'
		);
		const content = query(
			root,
			'consent-widget-vendor-content-measurement-posthog'
		);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
		expect(content.hasAttribute('inert')).toBe(true);
		trigger.click();
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		expect(content.getAttribute('data-state')).toBe('open');
		expect(content.textContent).toContain('Product analytics.');
		expect(content.querySelector('a')?.getAttribute('href')).toBe(
			'https://posthog.com/privacy'
		);
	});

	it('renders no vendor list for a category without vendors', async () => {
		const client = await start({ vendors: [] });
		const { root } = client.ui as ConsentUIHandle;
		client.openDialog();
		expect(
			root.querySelector('[data-testid^="consent-widget-vendor-list"]')
		).toBeNull();
	});
});

describe('reading vendor consent', () => {
	it('exposes declared vendors and whether each may load', async () => {
		const client = createConsentClient({ ...baseOptions, ui: false });
		clients.push(client);
		client.start();
		await client.ready();
		expect(
			client
				.getDeclaredVendors()
				.map((vendor) => vendor.id)
				.toSorted()
		).toEqual(['posthog', 'x-pixel', 'youtube']);
		expect(client.isVendorAllowed('posthog')).toBe(false);
		// An undeclared vendor, such as a typo, never reads as allowed.
		expect(client.isVendorAllowed('unknown-vendor')).toBe(false);
		await client.acceptAll();
		expect(client.isVendorAllowed('posthog')).toBe(true);
		expect(client.isVendorAllowed('x-pixel')).toBe(true);
		expect(client.isVendorAllowed('unknown-vendor')).toBe(false);
	});

	it('emits consent when only a vendor changes', async () => {
		const client = createConsentClient({ ...baseOptions, ui: false });
		clients.push(client);
		client.start();
		await client.ready();
		await client.save({ measurement: true });
		const listener = vi.fn();
		client.on('consent', listener);
		await client.save({ measurement: true, vendors: { posthog: false } });
		expect(listener).toHaveBeenCalledOnce();
	});

	it('takes vendors from a queued config call and reads them through window.c15t', async () => {
		const api = createGlobal({ pkg: '@c15t/browser/test' });
		api.config({ ...baseOptions, ui: false });
		const client = api.init();
		clients.push(client);
		await api.ready();
		expect(api.getDeclaredVendors().map((vendor) => vendor.id)).toContain(
			'posthog'
		);
		await api.save({ measurement: true, vendors: { posthog: false } });
		expect(api.getVendorChoice()?.denied).toEqual(['posthog']);
		expect(api.isVendorAllowed('posthog')).toBe(false);
		expect(api.isVendorAllowed('youtube')).toBe(true);
	});
});

describe('gated inline scripts with data-c15t-vendor', () => {
	it('keeps a tag inert while its vendor is off, and runs the rest of the category', async () => {
		const posthog = inertScript('measurement', 'posthog', 'window.__ph = 1;');
		const youtube = inertScript('measurement', 'youtube', 'window.__yt = 1;');
		const client = createConsentClient({ ...baseOptions, ui: false });
		clients.push(client);
		client.start();
		await client.ready();
		await client.save({ measurement: true, vendors: { posthog: false } });

		expect(youtube.isConnected).toBe(false);
		expect(posthog.isConnected).toBe(true);
		expect(posthog.hasAttribute('data-c15t-activated')).toBe(false);

		// Lifting the denial on its own, with no category change, runs it.
		await client.save({ measurement: true, vendors: { posthog: true } });
		expect(posthog.isConnected).toBe(false);
		const activated = document.querySelector(
			'script[data-c15t-vendor="posthog"][data-c15t-activated="true"]'
		);
		expect(activated).not.toBeNull();
	});

	it('gates a vendor-named tag in a standalone scan', async () => {
		const client = createConsentClient({ ...baseOptions, ui: false });
		clients.push(client);
		client.start();
		await client.ready();
		await client.save({ measurement: true, vendors: { posthog: false } });
		const root = document.createElement('div');
		document.body.append(root);
		const script = document.createElement('script');
		script.type = 'text/plain';
		script.setAttribute('data-c15t-category', 'measurement');
		script.setAttribute('data-c15t-vendor', 'posthog');
		root.append(script);
		expect(activateGatedScripts(client.getSnapshot(), root)).toBe(0);
		expect(script.isConnected).toBe(true);
	});

	it('declares the slug an inert tag names, so a stored denial holds before any declaration', async () => {
		inertScript('measurement', 'late-vendor', 'window.__late = 1;');
		const client = createConsentClient({ ...baseOptions, ui: false });
		clients.push(client);
		client.start();
		await client.ready();
		expect(
			client
				.getSnapshot()
				.vendors?.declared.some((vendor) => vendor.id === 'late-vendor')
		).toBe(true);
	});
});

describe('gated iframes with data-vendor', () => {
	it('keeps a frame paused while its vendor is off', async () => {
		const frame = document.createElement('iframe');
		frame.setAttribute('data-src', 'https://example.test/embed');
		frame.setAttribute('data-category', 'measurement');
		frame.setAttribute('data-vendor', 'posthog');
		document.body.append(frame);
		const client = createConsentClient({ ...baseOptions, ui: false });
		clients.push(client);
		client.start();
		await client.ready();
		await client.save({ measurement: true, vendors: { posthog: false } });
		await Promise.resolve();
		expect(frame.getAttribute('src')).toBeNull();
		await client.save({ measurement: true, vendors: { posthog: true } });
		await vi.waitFor(() =>
			expect(frame.getAttribute('src')).toBe('https://example.test/embed')
		);
	});
});
