/**
 * `theme.slots` reaches the preference dialog whichever framework renders
 * the island. Every provider applies the slots itself: React and Vue map
 * them onto their `components` parts. Vitest resolves `svelte` to its
 * server build, so the Svelte case checks the props the adapter hands it.
 */

import type { Theme } from '@c15t/ui/theme';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { boot } from '../client';
import type { AstroConsentClient } from '../client';
// Vite compiles each island's whole component tree on first import. That
// takes seconds on a busy machine. Static imports do it while this file
// loads, so no test timeout covers the compile.
import * as reactPanelSurface from '../components/islands/panel-surface';
import * as vuePanelSurface from '../components/islands/panel-surface.vue';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import type { C15tUIAdapterName } from '../types';
import { registerDialogAdapter, registerDialogSurface } from '../ui/adapter';
import { buildProviderProps } from '../ui/provider-props';
import { reactDialogAdapter } from '../ui/react';
import { vueDialogAdapter } from '../ui/vue';
// The Vue adapter imports its plugin on first mount. Importing it here
// compiles it while this file loads, outside any test timeout.
import '@c15t/vue/vue-plugin';

import { testRule } from './policy-fixture';
import { ISLAND_RENDER_TIMEOUT } from './react-dialog-island';

const THEME: Theme = {
	slots: {
		consentDialogCard: {
			className: 'brand-dialog-card',
			style: { borderTopWidth: '4px' },
		},
		consentDialogTitle: 'brand-dialog-title',
		consentWidget: 'brand-widget',
		toggle: 'brand-toggle',
	},
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
	localStorage.clear();
});

const openDialog = async function openDialog(
	ui: 'react' | 'vue'
): Promise<void> {
	const host = document.createElement('div');
	host.setAttribute('data-c15t-dialog-host', 'preferences');
	document.body.append(host);
	cleanup.push(() => host.remove());
	if (ui === 'react') {
		registerDialogAdapter('react', () => Promise.resolve(reactDialogAdapter));
		registerDialogSurface('react', () => Promise.resolve(reactPanelSurface));
	} else {
		registerDialogAdapter('vue', () => Promise.resolve(vueDialogAdapter));
		registerDialogSurface('vue', () => Promise.resolve(vuePanelSurface));
	}
	const client: AstroConsentClient = boot(
		resolveOptions({
			consentCategories: ['necessary', 'marketing'],
			mode: offlineMode({ policyRules: [testRule] }),
			theme: THEME,
			ui,
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
				document.querySelector('[data-testid="consent-dialog-card"]')
			).not.toBeNull(),
		ISLAND_RENDER_TIMEOUT
	);
};

const part = (selector: string): HTMLElement | null =>
	document.querySelector<HTMLElement>(selector);

describe.each(['react', 'vue'] as const)('the %s dialog island', (ui) => {
	it('applies theme.slots to the dialog parts', async () => {
		await openDialog(ui);

		const card = part('[data-testid="consent-dialog-card"]');
		expect(card?.classList).toContain('brand-dialog-card');
		// The slot adds to the stock classes; it does not replace them.
		expect(card?.classList.length).toBeGreaterThan(1);
		expect(card?.style.borderTopWidth).toBe('4px');
		expect(part('[data-testid="consent-dialog-title"]')?.classList).toContain(
			'brand-dialog-title'
		);
		await vi.waitFor(() =>
			expect(part('[data-testid="consent-widget-root"]')?.classList).toContain(
				'brand-widget'
			)
		);
		expect(part('[role="switch"]')?.classList).toContain('brand-toggle');
	});
});

describe('the svelte dialog island', () => {
	it('receives theme.slots on the provider theme', () => {
		const options = resolveOptions({
			mode: offlineMode({ policyRules: [testRule] }),
			theme: THEME,
			ui: 'svelte' satisfies C15tUIAdapterName,
		});
		// The props read the experiment assignment off the page runtime.
		const runtime = { kernel: { getSnapshot: () => ({}) } };
		const props = buildProviderProps(runtime as never, options);

		expect(props.options.theme?.slots).toEqual(THEME.slots);
	});
});
