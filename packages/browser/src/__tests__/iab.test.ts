import { getIABControls } from '@c15t/core';
import { clearGVLCache } from '@c15t/iab';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { init } from '../iab';
import { init as initOrdinary } from '../index';
import { offline } from '../transports/offline';
import type { ConsentClient, ConsentClientOptions } from '../types';

const clients: ConsentClient[] = [];
const start = async (
	options: ConsentClientOptions = {}
): Promise<ConsentClient> => {
	const client = init({
		iab: { cmpId: 28, gvl: completeGVL },
		mode: 'offline',
		overrides: { country: 'DE' },
		ui: { styles: false },
		...options,
	});
	clients.push(client);
	await client.ready();
	await client.runtime.iab?.whenReady?.();
	return client;
};
const query = (client: ConsentClient, id: string): HTMLElement => {
	const found = client.ui?.root.querySelector<HTMLElement>(
		`[data-testid="${id}"]`
	);
	if (!found) {
		throw new Error(`Missing ${id}`);
	}
	return found;
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	clearGVLCache();
	localStorage.clear();
	for (const entry of document.cookie.split(';')) {
		document.cookie = `${entry.split('=')[0]?.trim()}=; Max-Age=0; path=/`;
	}
	document.body.replaceChildren();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('IAB browser entry', () => {
	it('replays vendor API calls queued while the GVL is loading', async () => {
		const response = Promise.withResolvers<Response>();
		vi.stubGlobal(
			'fetch',
			vi.fn(() => response.promise)
		);
		const client = init({
			iab: { cmpId: 28, gvlURL: 'https://example.test/gvl.json' },
			mode: 'offline',
			overrides: { country: 'DE' },
			ui: false,
		});
		clients.push(client);
		await client.ready();
		const listener = vi.fn();
		window.__tcfapi?.('addEventListener', 2, listener);
		response.resolve(Response.json(completeGVL));
		await client.runtime.iab?.whenReady?.();
		expect(listener).toHaveBeenCalled();
	});
	it('removes an unfulfilled stub on disposal and does not install a late CMP', async () => {
		const response = Promise.withResolvers<Response>();
		vi.stubGlobal(
			'fetch',
			vi.fn(() => response.promise)
		);
		const client = init({
			iab: { cmpId: 28, gvlURL: 'https://example.test/gvl.json' },
			mode: 'offline',
			overrides: { country: 'DE' },
			ui: false,
		});
		clients.push(client);
		await client.ready();
		const ready = client.runtime.iab?.whenReady?.();
		client.dispose();
		expect(window.__tcfapi).toBeUndefined();
		response.resolve(Response.json(completeGVL));
		await ready;
		expect(window.__tcfapi).toBeUndefined();
	});
	it('binds one CMP to the page kernel and installs the stub synchronously', async () => {
		const client = init({
			iab: { cmpId: 28, gvl: completeGVL },
			mode: 'offline',
			overrides: { country: 'DE' },
			ui: false,
		});
		clients.push(client);
		expect(typeof window.__tcfapi).toBe('function');
		await client.ready();
		await client.runtime.iab?.whenReady?.();
		expect(getIABControls(client.kernel)).toBe(client.runtime.iab);
		expect(client.getSnapshot().model).toBe('iab');
		client.dispose();
		expect(getIABControls(client.kernel)).toBeUndefined();
		expect(window.__tcfapi).toBeUndefined();
	});
	it('accepts, persists TC authority, and withdraws through the IAB handle', async () => {
		const client = await start();
		expect((await client.acceptAll()).ok).toBe(true);
		const authority = client.getSnapshot().iab?.authority;
		expect(authority?.tcString).toBeTruthy();
		expect(authority?.vendorConsents['755']).toBe(true);
		expect(document.cookie).toContain('euconsent-v2=');
		client.openDialog();
		expect((await client.rejectAll()).ok).toBe(true);
		expect(
			Boolean(client.getSnapshot().iab?.authority?.vendorConsents['755'])
		).toBe(false);
		expect(client.getSnapshot().activeUI).toBe('none');
	});
	it('restores authority after recreating the client', async () => {
		const first = await start();
		await first.acceptAll();
		const tc = first.getSnapshot().iab?.authority?.tcString;
		first.dispose();
		const next = await start();
		await vi.waitFor(() =>
			expect(next.getSnapshot().iab?.authority?.tcString).toBe(tc)
		);
	});
	it('saves individual purpose, vendor, legitimate-interest and special-feature choices', async () => {
		const client = await start();
		client.openDialog();
		const handle = client.runtime.iab;
		handle?.setPurposeConsent(1, true);
		handle?.setVendorConsent(755, true);
		handle?.setPurposeLegitimateInterest(2, true);
		handle?.setVendorLegitimateInterest(10, true);
		handle?.setSpecialFeatureOptIn(1, true);
		expect((await client.saveIAB()).ok).toBe(true);
		const authority = client.getSnapshot().iab?.authority;
		expect(authority?.purposeConsents[1]).toBe(true);
		expect(authority?.vendorConsents['755']).toBe(true);
		expect(authority?.specialFeatureOptIns[1]).toBe(true);
	});
	it('renders the shared display rows and updates a switch without replacing focus', async () => {
		const client = await start();
		query(client, 'iab-consent-banner-customize-button').click();
		const control = query(client, 'purpose-item-1-consent');
		control.focus();
		control.click();
		expect(query(client, 'purpose-item-1-consent')).toBe(control);
		expect(control.getAttribute('aria-checked')).toBe('true');
		expect(document.activeElement?.shadowRoot?.activeElement).toBe(control);
		expect(query(client, 'special-feature-item-1')).toBeTruthy();
		expect(
			query(client, 'special-purpose-item-1').querySelector('[role="switch"]')
		).toBeNull();
	});
	it('opens the vendors tab from the partner disclosure and shows policy URLs', async () => {
		const client = await start();
		query(client, 'iab-consent-banner-partners-link').click();
		const panel =
			client.ui?.root.querySelector<HTMLElement>('#c15t-iab-vendors');
		expect(panel?.hidden).toBe(false);
		expect(query(client, 'iab-vendor-755').querySelector('a')?.href).toBe(
			'https://policies.google.com/privacy'
		);
		query(client, 'iab-vendor-755-consent').click();
		expect(client.getSnapshot().iab?.vendorConsents['755']).toBe(true);
	});
	it('rejects category-only saves and ordinary-entry IAB configuration', async () => {
		const client = await start();
		expect((await client.save({ marketing: true })).ok).toBe(false);
		expect(client.getSnapshot().iab?.authority).toBeNull();
		expect(() => initOrdinary({ iab: { cmpId: 28 } })).toThrow('IAB requires');
	});
	it('uses ordinary UI when a region resolves a non-IAB policy', async () => {
		const client = await start({ policyRules: ['europeOptIn'] });
		expect(client.getSnapshot().model).toBe('opt-in');
		expect(query(client, 'consent-banner-card')).toBeTruthy();
		expect(
			client.ui?.root.querySelector('[data-testid="iab-consent-banner-root"]')
		).toBeNull();
	});
	it('updates CMP applicability and display status after policy and UI changes', async () => {
		const client = await start();
		const ping = () => {
			const result = Promise.withResolvers<{
				gdprApplies?: boolean;
				displayStatus?: string;
			}>();
			window.__tcfapi?.('ping', 2, (data) => result.resolve(data));
			return result.promise;
		};
		client.openDialog();
		expect(await ping()).toMatchObject({
			displayStatus: 'visible',
			gdprApplies: true,
		});
		client.closeDialog();
		expect(await ping()).toMatchObject({ displayStatus: 'hidden' });
		client.setOverrides({ country: 'US', region: 'CA' });
		await client.kernel.commands.init();
		expect(await ping()).toMatchObject({ gdprApplies: false });
		client.setOverrides({ country: 'DE' });
		await client.kernel.commands.init();
		expect(await ping()).toMatchObject({ gdprApplies: true });
	});
	it('handles tab keys, search, and vendor controls without losing the current draft', async () => {
		const client = await start();
		client.openDialog();
		const tab = client.ui?.root.querySelector<HTMLButtonElement>(
			'#c15t-iab-purposes-tab'
		);
		tab?.dispatchEvent(
			new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' })
		);
		const vendorsTab = client.ui?.root.querySelector('#c15t-iab-vendors-tab');
		expect(vendorsTab?.getAttribute('aria-selected')).toBe('true');
		const search = client.ui?.root.querySelector<HTMLInputElement>(
			'input[type="search"]'
		);
		if (!search) {
			throw new Error('Missing search');
		}
		search.value = 'index';
		search.dispatchEvent(new Event('input'));
		expect(
			client.ui?.root.querySelectorAll(
				'[data-c15t-iab-disclosure][data-testid^="iab-vendor-"]'
			).length
		).toBe(1);
		query(client, 'iab-vendor-10-li').click();
		expect(client.getSnapshot().iab?.vendorLegitimateInterests['10']).toBe(
			true
		);
		search.value = '';
		search.dispatchEvent(new Event('input'));
		expect(query(client, 'iab-vendor-10-li').getAttribute('aria-checked')).toBe(
			'true'
		);
	});
	it('keeps preferences available after a failed backend save', async () => {
		const factory = offline();
		const mode: typeof factory = Object.assign(
			(context: Parameters<typeof factory>[0]) => ({
				...factory(context),
				save: () => Promise.reject(new Error('network unavailable')),
			}),
			{ kind: 'custom' as const }
		);
		const client = await start({ mode });
		client.openDialog();
		const errors = vi.fn();
		client.on('error', errors);
		expect((await client.acceptAll()).ok).toBe(false);
		expect(client.getSnapshot().activeUI).toBe('dialog');
		expect(errors).toHaveBeenCalled();
		query(client, 'iab-consent-dialog-accept-button').click();
		await vi.waitFor(() =>
			expect(
				client.ui?.root.querySelector('[role="alert"]')?.textContent
			).toContain('Unable to save')
		);
	});
	it('shows GVL failure and prevents confirmation without a loaded vendor list', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		const client = init({
			iab: { cmpId: 28, gvlURL: 'https://example.test/gvl.json' },
			mode: 'offline',
			overrides: { country: 'DE' },
			ui: { styles: false },
		});
		clients.push(client);
		await client.ready();
		await expect(client.runtime.iab?.whenReady?.()).rejects.toThrow(
			'Unable to load'
		);
		await vi.waitFor(() =>
			expect(
				client.ui?.root.querySelector('[role="alert"]')?.textContent
			).toContain('Unable to load')
		);
		expect((await client.acceptAll()).ok).toBe(false);
	});
});
