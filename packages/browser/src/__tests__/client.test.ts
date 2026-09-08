import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
import type { ConsentClient } from '../types';

const clients: ConsentClient[] = [];

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

const start = function start(
	options: Parameters<typeof createConsentClient>[0] = {}
): ConsentClient {
	const client = createConsentClient(
		{
			consentCategories: ['measurement', 'marketing'],
			reloadOnConsentRevoked: false,
			...options,
		},
		{ pkg: '@c15t/browser/test' }
	);
	clients.push(client);
	client.start();
	return client;
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	clearCookies();
	document.body.replaceChildren();
});

describe('createConsentClient', () => {
	it('resolves an offline policy and asks for the banner', async () => {
		const client = start();
		const snapshot = await client.ready();

		expect(client.mode).toBe('offline');
		expect(snapshot.activeUI).toBe('banner');
		expect(snapshot.model).toBe('opt-in');
		expect(client.hasConsented()).toBe(false);
		expect(client.consentCategories).toEqual([
			'necessary',
			'measurement',
			'marketing',
		]);
	});

	it('acceptAll grants the offered categories and closes the UI', async () => {
		const client = start();
		await client.ready();
		const onConsent = vi.fn();
		client.on('consent', onConsent);

		await client.acceptAll();

		expect(client.hasConsented()).toBe(true);
		expect(client.has('measurement')).toBe(true);
		expect(client.has('marketing')).toBe(true);
		expect(client.getSnapshot().activeUI).toBe('none');
		expect(onConsent).toHaveBeenCalled();
	});

	it('rejectAll keeps only strictly necessary', async () => {
		const client = start();
		await client.ready();

		await client.rejectAll();

		expect(client.has('necessary')).toBe(true);
		expect(client.has('measurement')).toBe(false);
	});

	it('save persists a partial choice', async () => {
		const client = start();
		await client.ready();

		await client.save({ marketing: false, measurement: true });

		expect(client.has('measurement')).toBe(true);
		expect(client.has('marketing')).toBe(false);
		expect(client.hasConsented()).toBe(true);
	});

	it('emits ui changes as client events and document events', async () => {
		const client = start();
		await client.ready();
		const onUI = vi.fn();
		const onDocument = vi.fn();
		client.on('ui', onUI);
		document.addEventListener('c15t:ui', onDocument);

		client.openDialog();

		expect(onUI).toHaveBeenCalledWith('dialog');
		expect(onDocument).toHaveBeenCalledOnce();
		expect(onDocument.mock.calls[0]?.[0]).toMatchObject({ detail: 'dialog' });
		document.removeEventListener('c15t:ui', onDocument);
	});

	it('replays ready to listeners attached after init', async () => {
		const client = start();
		await client.ready();
		const onReady = vi.fn();

		client.on('ready', onReady);

		expect(onReady).toHaveBeenCalledOnce();
	});

	it('wires data-c15t-action buttons anywhere on the page', async () => {
		const client = start();
		await client.ready();
		const accept = document.createElement('button');
		accept.setAttribute('data-c15t-action', 'accept');
		document.body.append(accept);

		accept.click();
		await vi.waitFor(() => {
			expect(client.hasConsented()).toBe(true);
		});
	});

	it('opens the preference centre from a #c15t-preferences link', async () => {
		const client = start();
		await client.ready();
		const link = document.createElement('a');
		link.href = '#c15t-preferences';
		link.textContent = 'Cookie settings';
		document.body.append(link);

		link.click();

		expect(client.getSnapshot().activeUI).toBe('dialog');
	});

	it('remembers a stored choice on the next page load', async () => {
		const first = start();
		await first.ready();
		await first.acceptAll();
		first.dispose();

		const second = start();
		expect(second.hasConsented()).toBe(true);
		expect(second.getSnapshot().activeUI).toBe('none');
		await second.ready();
		expect(second.getSnapshot().activeUI).toBe('none');
	});

	it('picks hosted mode from a backendURL and requires one for hosted', () => {
		expect(() =>
			createConsentClient({ mode: 'hosted' }, { pkg: 'test' })
		).toThrow(/backendURL/u);

		const client = createConsentClient(
			{ backendURL: 'https://example.test' },
			{ pkg: 'test' }
		);
		clients.push(client);
		expect(client.mode).toBe('hosted');
	});

	it('resolves policy presets by name and picks one by country', async () => {
		const german = start({
			overrides: { country: 'DE' },
			policies: ['europeOptIn', 'californiaOptOut', 'worldNoBanner'],
		});
		expect((await german.ready()).model).toBe('opt-in');
		german.dispose();

		const californian = start({
			overrides: { country: 'US', region: 'CA' },
			policies: ['europeOptIn', 'californiaOptOut', 'worldNoBanner'],
		});
		expect((await californian.ready()).model).toBe('opt-out');
		californian.dispose();

		const elsewhere = start({
			overrides: { country: 'BR' },
			policies: ['europeOptIn', 'californiaOptOut', 'worldNoBanner'],
		});
		const snapshot = await elsewhere.ready();
		expect(snapshot.model).toBeNull();
		expect(snapshot.activeUI).toBe('none');
	});

	it('rejects an unknown policy preset name', () => {
		expect(() =>
			createConsentClient(
				{ policies: ['everywhereOptIn' as never] },
				{ pkg: 'test' }
			)
		).toThrow(/unknown policy preset/u);
	});

	it('throws from mountUI in the headless build', () => {
		const client = start({ ui: false });
		expect(() => client.mountUI()).toThrow(/headless/u);
	});

	it('resolves ready straight away when disabled', async () => {
		const client = start({ enabled: false });
		await expect(client.ready()).resolves.toBeDefined();
		expect(client.has('marketing')).toBe(true);
	});
});
