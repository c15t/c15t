/**
 * `<ConsentDialog legalLinks>` reaches the island.
 *
 * The dialog is an island mounted on first open, so the list the page's
 * `<ConsentDialog />` asked for travels on its host element and each
 * adapter hands it to its framework's dialog. The React and Vue cases boot
 * the page client and open the real island. Svelte has no case here:
 * Vitest resolves `svelte` to its server build, where `mount()` throws.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { boot } from '../client';
import type { AstroConsentClient } from '../client';
// Vite compiles each island's whole component tree on first import. That
// takes seconds on a busy machine. Static imports do it while this file
// loads, so no test timeout covers the compile.
import * as reactPanelSurface from '../components/islands/panel-surface';
import * as vuePanelSurface from '../components/islands/panel-surface.vue';
import { resolveOptions } from '../integration';
import { offline as offlineMode } from '../mode';
import { registerDialogAdapter, registerDialogSurface } from '../ui/adapter';
import { reactDialogAdapter } from '../ui/react';
import { vueDialogAdapter } from '../ui/vue';
// The Vue adapter imports its plugin on first mount. Importing it here
// compiles it while this file loads, outside any test timeout.
import '@c15t/vue/vue-plugin';

import { testRule } from './policy-fixture';
import { ISLAND_RENDER_TIMEOUT } from './react-dialog-island';

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
	registerDialogSurface('react', () => Promise.resolve(reactPanelSurface));
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
	await vi.waitFor(
		() =>
			expect(
				document.querySelector('[data-testid="consent-dialog-description"]')
			).not.toBeNull(),
		ISLAND_RENDER_TIMEOUT
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

describe('the Vue preferences dialog', () => {
	it('shows the legal links <ConsentDialog legalLinks> names', async () => {
		registerDialogAdapter('vue', () => Promise.resolve(vueDialogAdapter));
		registerDialogSurface('vue', () => Promise.resolve(vuePanelSurface));
		renderDialogHost('privacyPolicy cookiePolicy');
		const client: AstroConsentClient = boot(
			resolveOptions({
				legalLinks: {
					cookiePolicy: { href: '/cookies' },
					privacyPolicy: { href: '/privacy', label: 'Privacy' },
				},
				mode: offlineMode({ policyRules: [testRule] }),
				ui: 'vue',
			})
		);
		cleanup.push(() => {
			client.dispose();
			document.getElementById('c15t-dialog-host')?.remove();
		});
		await client.openDialog();

		// The Vue dialog teleports to `<body>`, out of the island's host.
		const vueLink = (type: string) =>
			document.querySelector<HTMLAnchorElement>(
				`[data-testid="consent-dialog-description"] a[href="/${type}"]`
			);
		await vi.waitFor(() => expect(vueLink('privacy')).not.toBeNull());
		expect(vueLink('privacy')?.textContent).toContain('Privacy');
		// No label of its own, so the translated name for the type.
		expect(vueLink('cookies')?.textContent).toContain('Cookie Policy');
	});
});
