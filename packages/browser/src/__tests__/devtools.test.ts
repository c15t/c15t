import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
import { mountDevTools } from '../devtools';
import { createGlobal, installGlobal } from '../global';
import type { C15tGlobal } from '../global';
import type { ConsentClient } from '../types';

type TestWindow = Window & { c15t?: unknown };

const testWindow = window as TestWindow;
const clients: ConsentClient[] = [];

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

afterEach(() => {
	(testWindow.c15t as C15tGlobal | undefined)?.dispose?.();
	testWindow.c15t = undefined;
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	clearCookies();
	document.body.replaceChildren();
});

describe('mountDevTools', () => {
	it('mounts the panel against the client kernel', async () => {
		const client = createConsentClient(
			{ consentCategories: ['measurement'], ui: false },
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();
		await client.ready();

		const devtools = mountDevTools(client, { defaultOpen: true });

		// The panel lives in a shadow root on a host in <body>.
		const host = document.body.querySelector('[data-c15t-dev-tools-host]');
		expect(devtools.element).not.toBeNull();
		expect(host?.shadowRoot?.contains(devtools.element)).toBe(true);
		devtools.destroy();
		expect(
			document.body.querySelector('[data-c15t-dev-tools-host]')
		).toBeNull();
	});

	it('changes location through the panel and re-resolves the policy', async () => {
		const client = createConsentClient(
			{
				overrides: { country: 'DE' },
				policyRules: ['europeOptIn', 'worldNone'],
				ui: false,
			},
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();
		await client.ready();
		expect(client.getSnapshot().activeUI).toBe('banner');

		const devtools = mountDevTools(client);
		devtools.actions.setOverrides({ country: 'US' });
		await devtools.actions.init();

		expect(client.getSnapshot().activeUI).toBe('none');
		expect(client.getSnapshot().model).toBe('none');
		devtools.destroy();
	});
});

describe('window.c15t.onInit', () => {
	it('runs queued onInit calls once the client exists', () => {
		const onInit = vi.fn();
		testWindow.c15t = [['onInit', onInit]];
		const api = createGlobal({ pkg: 'test' });

		installGlobal(api);
		expect(onInit).not.toHaveBeenCalled();
		const client = api.init({ ui: false });

		return vi.waitFor(() => {
			expect(onInit).toHaveBeenCalledWith(client);
		});
	});

	it('runs immediately after init and can be cancelled before it', async () => {
		const api = createGlobal({ pkg: 'test' });
		installGlobal(api);
		const cancelled = vi.fn();
		api.onInit(cancelled)();
		const client = api.init({ ui: false });
		const late = vi.fn();
		api.onInit(late);

		await vi.waitFor(() => {
			expect(late).toHaveBeenCalledWith(client);
		});
		expect(cancelled).not.toHaveBeenCalled();
	});
});
