/**
 * The Astro dialog islands list categories in the draft's order: necessary,
 * functionality, measurement, experience, marketing, whichever framework
 * the `ui` option names. Neither the policy nor the configured list sets
 * the order.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { boot } from '../client';
import { resolveOptions } from '../integration';
import { offline as offlineMode } from '../mode';
import { registerDialogAdapter, registerDialogSurface } from '../ui/adapter';
import { reactDialogAdapter } from '../ui/react';
import { vueDialogAdapter } from '../ui/vue';
import { testRule } from './policy-fixture';

const ITEM_PREFIX = 'consent-widget-accordion-item-';

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
	document.body.innerHTML = '';
	localStorage.clear();
});

const listedRows = (): (string | undefined)[] =>
	[
		...document.querySelectorAll<HTMLElement>(
			`[data-testid^="${ITEM_PREFIX}"]`
		),
	].map((item) => item.dataset.testid?.slice(ITEM_PREFIX.length));

describe.each(['react', 'vue'] as const)('the %s dialog island', (ui) => {
	it(
		'lists categories in the draft order, not the policy or configured order',
		{ timeout: 20_000 },
		async () => {
			const host = document.createElement('div');
			host.setAttribute('data-c15t-dialog-host', 'preferences');
			document.body.append(host);
			cleanup.push(() => host.remove());
			if (ui === 'react') {
				registerDialogAdapter('react', () =>
					Promise.resolve(reactDialogAdapter)
				);
				registerDialogSurface(
					'react',
					() => import('../components/islands/panel-surface')
				);
			} else {
				registerDialogAdapter('vue', () => Promise.resolve(vueDialogAdapter));
				registerDialogSurface(
					'vue',
					() => import('../components/islands/panel-surface.vue')
				);
			}
			const client = boot(
				resolveOptions({
					consentCategories: [
						'marketing',
						'experience',
						'necessary',
						'measurement',
						'functionality',
					],
					mode: offlineMode({
						policyRules: [
							{
								...testRule,
								categories: [
									'marketing',
									'measurement',
									'functionality',
									'experience',
								],
							},
						],
					}),
					reloadOnConsentRevoked: false,
					ui,
				})
			);
			cleanup.push(() => {
				client.dispose();
				document.getElementById('c15t-dialog-host')?.remove();
			});
			await client.openDialog();

			// The first open imports the framework and the island.
			await vi.waitFor(() => expect(listedRows()).toHaveLength(5), {
				timeout: 10_000,
			});
			expect(listedRows()).toEqual([
				'necessary',
				'functionality',
				'measurement',
				'experience',
				'marketing',
			]);
		}
	);
});
