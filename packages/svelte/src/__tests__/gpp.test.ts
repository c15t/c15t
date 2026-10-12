/**
 * The provider's `gpp` option mounts the IAB GPP CMP API (`window.__gpp`)
 * from `@c15t/iab/gpp`, which loads through a dynamic import only when the
 * option is set, and removes it again when the provider unmounts.
 */
import { setTimeout as sleep } from 'node:timers/promises';

import { mount, unmount } from 'svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import ProviderOnlyFixture from './fixtures/provider-only-fixture.svelte';
import { testOffline } from './test-offline';

interface GPPPing {
	cmpId: number;
	cmpStatus: string;
}

interface WindowWithGPP extends Window {
	__gpp?: (
		command: string,
		callback: (data: unknown, success: boolean) => void
	) => void;
}

const gppWindow = window as WindowWithGPP;

const ping = (): GPPPing | undefined => {
	let data: GPPPing | undefined;
	gppWindow.__gpp?.('ping', (result) => {
		data = result as GPPPing;
	});
	return data;
};

const mounted: ReturnType<typeof mount>[] = [];

const mountProvider = function mountProvider(
	options: Partial<ConsentManagerOptions>
) {
	const target = document.createElement('div');
	document.body.append(target);
	const app = mount(ProviderOnlyFixture, {
		props: {
			options: {
				mode: testOffline(),
				persistence: false,
				...options,
			} as ConsentManagerOptions,
		},
		target,
	});
	mounted.push(app);
	return app;
};

afterEach(() => {
	for (const app of mounted.splice(0)) {
		void unmount(app);
	}
	delete gppWindow.__gpp;
});

describe('ConsentProvider gpp option', () => {
	test('installs __gpp with the given options and removes it on unmount', async () => {
		const app = mountProvider({ gpp: { cmpId: 42 } });

		// `@c15t/iab/gpp` arrives through a dynamic import, so the first
		// run pays for transforming it as well as loading it.
		await vi.waitFor(
			() => {
				expect(ping()).toMatchObject({ cmpId: 42, cmpStatus: 'loaded' });
			},
			{ timeout: 10_000 }
		);

		mounted.splice(mounted.indexOf(app), 1);
		void unmount(app);

		expect(gppWindow.__gpp).toBeUndefined();
	});

	test('`gpp: true` installs __gpp with the defaults', async () => {
		mountProvider({ gpp: true });

		await vi.waitFor(
			() => {
				expect(ping()).toMatchObject({ cmpStatus: 'loaded' });
			},
			{ timeout: 10_000 }
		);
	}, 15_000);

	test.each([
		['omitted', {}],
		['false', { gpp: false }],
	] as const)('leaves __gpp absent when `gpp` is %s', async (_, options) => {
		mountProvider(options);

		await vi.waitFor(() => {
			expect(document.querySelector('[data-testid="render-child"]')).not.toBe(
				null
			);
		});
		// Long enough for a dynamic import to have landed, had one started.
		await sleep(50);
		expect(gppWindow.__gpp).toBeUndefined();
	});
});
