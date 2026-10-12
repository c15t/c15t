import { clearGVLCache } from '@c15t/iab';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import type { ConsentClient } from '../types';
import { initIAB as init } from './fixtures/factory-init';

const clients: ConsentClient[] = [];

beforeEach(() => {
	const list = {
		providers: {
			'89': {
				id: 89,
				name: 'Example Ad Tech',
				policyUrl: 'https://ads.example/privacy',
			},
		},
	};
	vi.stubGlobal(
		'fetch',
		vi.fn(() => Promise.resolve(Response.json(list)))
	);
});

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	vi.unstubAllGlobals();
	clearGVLCache();
	localStorage.clear();
	document.body.replaceChildren();
});

it('lists Google ad tech providers with their privacy policy and a consent switch', async () => {
	const client = init({
		iab: {
			additionalConsent: { providers: [89], url: 'https://lists.example/ac' },
			cmpId: 28,
			gvl: completeGVL,
		},
		mode: 'offline',
		overrides: { country: 'DE' },
		ui: { styles: false },
	});
	clients.push(client);
	await client.ready();
	await client.runtime.iab?.whenReady?.();
	client.openDialog();

	const root = client.ui?.root;
	const vendorsTab = root?.querySelector<HTMLButtonElement>(
		'#c15t-iab-vendors-tab'
	);
	const vendorCount = Object.keys(completeGVL.vendors).length;
	expect(vendorsTab?.textContent).toContain(`(${vendorCount + 1})`);
	vendorsTab?.click();

	const row = root?.querySelector('[data-testid="iab-ad-tech-provider-89"]');
	expect(row?.textContent).toContain('Example Ad Tech');
	expect(row?.querySelector('a')?.getAttribute('href')).toBe(
		'https://ads.example/privacy'
	);
	expect(root?.textContent).toContain('Google Ad Tech Providers (1)');
	const count = root?.querySelector('p[aria-live="polite"]');
	expect(count?.textContent).toBe(
		`${Math.min(50, vendorCount) + 1} of ${vendorCount + 1} vendors`
	);
	const search = root?.querySelector<HTMLInputElement>('input[type="search"]');
	if (search) {
		search.value = 'example ad tech';
		search.dispatchEvent(new Event('input'));
	}
	expect(count?.textContent).toBe('1 of 1 vendors');

	row
		?.querySelector<HTMLButtonElement>(
			'[data-testid="iab-ad-tech-provider-89-consent"]'
		)
		?.click();
	expect(client.getSnapshot().iab?.adTechProviderConsents).toEqual({
		'89': true,
	});
});
