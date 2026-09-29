/**
 * `<ConsentDialog legalLinks>` reaches the island.
 *
 * The dialog is an island mounted on first open, so the list the page's
 * `<ConsentDialog />` asked for travels on its host element and each
 * adapter hands it to its framework's dialog. The React case renders the
 * real surface. The Vue surface needs its compiler, so that case checks the
 * config the Vue dialog reads. Svelte has no case here: Vitest resolves
 * `svelte` to its server build, where `mount()` throws.
 */

import { hosted } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime } from '@c15t/core/runtime';
import { consentConfigKey } from '@c15t/vue/vue-plugin';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { h, inject, toValue } from 'vue';

import { boot } from '../client';
import type { AstroConsentClient } from '../client';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import type { C15tResolvedOptions } from '../types';
import { registerDialogAdapter, registerDialogSurface } from '../ui/adapter';
import { reactDialogAdapter } from '../ui/react';
import { vueDialogAdapter } from '../ui/vue';
import { testRule } from './policy-fixture';

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
	localStorage.clear();
});

/**
 * Put the markup `<ConsentDialog legalLinks={...} />` renders on the page.
 *
 * @param legalLinks - The `data-legal-links` value, or `null` for none.
 */
const renderDialogHost = function renderDialogHost(
	legalLinks: string | null
): void {
	const host = document.createElement('div');
	host.setAttribute('data-c15t-dialog-host', 'preferences');
	if (legalLinks !== null) {
		host.setAttribute('data-legal-links', legalLinks);
	}
	document.body.append(host);
	cleanup.push(() => host.remove());
};

const openReactDialog = async function openReactDialog(): Promise<void> {
	registerDialogAdapter('react', () => Promise.resolve(reactDialogAdapter));
	registerDialogSurface(
		'react',
		() => import('../components/islands/panel-surface')
	);
	const client: AstroConsentClient = boot(
		resolveOptions({
			legalLinks: {
				cookiePolicy: { href: '/cookies' },
				privacyPolicy: { href: '/privacy', label: 'Privacy' },
			},
			mode: offlineMode({ policyRules: [testRule] }),
			ui: 'react',
		})
	);
	cleanup.push(() => {
		client.dispose();
		document.getElementById('c15t-dialog-host')?.remove();
	});
	await client.openDialog();
	await vi.waitFor(() =>
		expect(
			document.querySelector('[data-testid="consent-dialog-description"]')
		).not.toBeNull()
	);
};

const link = (type: string) =>
	document.querySelector<HTMLAnchorElement>(
		`[data-testid="consent-dialog-legal-link-${type}"]`
	);

describe('the React preferences dialog', () => {
	it('shows the legal links <ConsentDialog legalLinks> names', async () => {
		renderDialogHost('privacyPolicy cookiePolicy');
		await openReactDialog();

		expect(link('privacyPolicy')?.getAttribute('href')).toBe('/privacy');
		expect(link('privacyPolicy')?.textContent).toContain('Privacy');
		// No label of its own, so the translated name for the type.
		expect(link('cookiePolicy')?.textContent).toContain('Cookie Policy');
	});

	it('shows none when <ConsentDialog /> names none', async () => {
		renderDialogHost(null);
		await openReactDialog();

		expect(link('privacyPolicy')).toBeNull();
	});
});

const OPTIONS = {
	consentCategories: ['necessary', 'marketing'],
	endpoints: { enabled: false, initPath: '/i', manifestPath: '/m' },
	legalLinks: { privacyPolicy: { href: '/privacy' } },
	mode: { type: 'hosted', url: 'https://consent.example.test' },
	ui: 'vue',
} as unknown as C15tResolvedOptions;

const createRuntime = function createRuntime(): ConsentRuntime {
	const runtime = createConsentRuntime({
		mode: hosted({ url: 'https://consent.example.test' }),
		pkg: '@c15t/astro-test',
	});
	cleanup.push(() => runtime.dispose());
	return runtime;
};

const createTarget = function createTarget(): HTMLElement {
	const target = document.createElement('div');
	document.body.append(target);
	cleanup.push(() => target.remove());
	return target;
};

describe('the Vue dialog adapter', () => {
	it('sets the list as the dialog links the Vue dialog reads', async () => {
		let seen: unknown;
		registerDialogSurface('vue', () =>
			Promise.resolve({
				default: {
					render: () => h('div'),
					setup() {
						seen = toValue(inject(consentConfigKey))?.dialogLegalLinks;
					},
				},
			})
		);

		const handle = await vueDialogAdapter.mount({
			kind: 'preferences',
			legalLinks: ['privacyPolicy'],
			options: OPTIONS,
			runtime: createRuntime(),
			target: createTarget(),
		});
		cleanup.push(() => handle.destroy());

		expect(seen).toEqual(['privacyPolicy']);
	});
});
