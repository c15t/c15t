import { policyRulePresets } from '@c15t/core';
import type { GPPPingData } from '@c15t/iab/gpp';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGlobal, installGlobal } from '../global';
import type { C15tGlobal } from '../global';
import { mountGPP } from '../gpp';
import type { ConsentClient, ScriptTagClientOptions } from '../types';
import { init } from './fixtures/factory-init';

const testWindow = window as Window & { c15t?: unknown };
const options: ScriptTagClientOptions = {
	overrides: { country: 'US', region: 'CA' },
	persistence: false,
	policyRules: [
		{ ...policyRulePresets.californiaOptOut(), match: { isDefault: true } },
	],
	ui: false,
};
const clients: ConsentClient[] = [];

const ping = (): GPPPingData | undefined => {
	let data: GPPPingData | undefined;
	window.__gpp?.('ping', (result) => {
		data = result as GPPPingData;
	});
	return data;
};

/** Run `c15t.gpp.js` the way a second script tag would. */
const loadAddon = async function loadAddon(): Promise<void> {
	vi.resetModules();
	await import('../entries/cdn-gpp');
};

/** Install the main tag over whatever the page queued. */
const loadTag = function loadTag(): C15tGlobal {
	return installGlobal(createGlobal({ pkg: '@c15t/browser/test' }));
};

afterEach(() => {
	(testWindow.c15t as C15tGlobal | undefined)?.dispose?.();
	testWindow.c15t = undefined;
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	delete window.__gpp;
	for (const frame of document.querySelectorAll('iframe')) {
		frame.remove();
	}
	vi.restoreAllMocks();
});

describe('mountGPP', () => {
	it('mounts __gpp on the client with the options and removes it on dispose', async () => {
		const client = init(options);
		clients.push(client);
		const gpp = mountGPP(client, { usFallback: 'none' });

		await vi.waitFor(() =>
			expect(ping()).toMatchObject({
				applicableSections: [8],
				cmpStatus: 'loaded',
				supportedAPIs: expect.not.arrayContaining(['7:usnat']),
			})
		);
		expect(gpp.getGPPString()).toMatch(/^DBAB/u);
		gpp.dispose();
		expect(window.__gpp).toBeUndefined();
	});

	it('leaves __gpp alone for a client without it', async () => {
		const client = init({ ...options, gpp: true });
		clients.push(client);
		await client.ready();
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
		expect(window.__gpp).toBeUndefined();
	});
});

describe('c15t.gpp.js', () => {
	it('mounts __gpp when it loads before the main tag', async () => {
		testWindow.c15t = [['config', options]];
		await loadAddon();
		expect(ping()?.cmpStatus).toBe('stub');

		loadTag().init();
		await vi.waitFor(() =>
			expect(ping()).toMatchObject({
				applicableSections: [8],
				cmpStatus: 'loaded',
				signalStatus: 'ready',
			})
		);
	});

	it('mounts __gpp when it loads after init', async () => {
		const api = loadTag();
		api.init(options);
		await api.ready();
		expect(window.__gpp).toBeUndefined();

		await loadAddon();
		await vi.waitFor(() => expect(ping()?.cmpStatus).toBe('loaded'));

		api.dispose();
		expect(window.__gpp).toBeUndefined();
	});

	it('takes over calls an ad tag queued on the stub', async () => {
		await loadAddon();
		const sections: unknown[] = [];
		window.__gpp?.('addEventListener', (event) => {
			const { eventName, data, pingData } = event as {
				eventName: string;
				data: unknown;
				pingData: GPPPingData;
			};
			if (eventName === 'signalStatus' && data === 'ready') {
				sections.push(pingData.applicableSections);
			}
		});

		loadTag().init(options);
		await vi.waitFor(() => expect(sections).toEqual([[8]]));
	});

	it('stays off and removes its stub when the page sets gpp: false', async () => {
		testWindow.c15t = [['config', { ...options, gpp: false }]];
		await loadAddon();
		const api = loadTag();
		api.init();
		await api.ready();

		await vi.waitFor(() => expect(window.__gpp).toBeUndefined());
		expect(document.querySelector('iframe[name="__gppLocator"]')).toBeNull();
	});
});
