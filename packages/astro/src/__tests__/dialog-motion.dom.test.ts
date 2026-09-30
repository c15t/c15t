/**
 * `disableAnimation` reaches the dialog island.
 *
 * The integration option and `<ConsentDialog disableAnimation>` both end
 * up in the options the dialog adapter mounts with, the prop winning. The
 * Vue case opens the real island. Svelte has no case here: Vitest resolves
 * `svelte` to its server build, where `mount()` throws.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { boot } from '../client';
import type { AstroConsentClient } from '../client';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import type { C15tAstroOptions } from '../types';
import {
	registerDialogAdapter,
	registerDialogSurface,
	resetDialogRegistriesForTest,
} from '../ui/adapter';
import type { ConsentDialogContext } from '../ui/adapter';
import { buildProviderProps } from '../ui/provider-props';
import { vueDialogAdapter } from '../ui/vue';
import { testRule } from './policy-fixture';

const cleanup: (() => Promise<void> | void)[] = [];

// jsdom has no `matchMedia`.
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
	resetDialogRegistriesForTest();
	(window as unknown as Record<string, unknown>).__c15tAstroConfig = undefined;
	localStorage.clear();
});

/**
 * Put the markup `<ConsentDialog disableAnimation={...} />` renders on
 * the page.
 *
 * @param disableAnimation - The `data-disable-animation` value, or
 * `undefined` for none.
 */
const renderDialogHost = function renderDialogHost(
	disableAnimation: 'true' | 'false' | undefined
): void {
	const host = document.createElement('div');
	host.setAttribute('data-c15t-dialog-host', 'preferences');
	if (disableAnimation !== undefined) {
		host.setAttribute('data-disable-animation', disableAnimation);
	}
	document.body.append(host);
	cleanup.push(() => host.remove());
};

const bootClient = function bootClient(
	options: Partial<C15tAstroOptions>
): AstroConsentClient {
	const client = boot(
		resolveOptions({
			mode: offlineMode({ policyRules: [testRule] }),
			...options,
		})
	);
	cleanup.push(() => {
		client.dispose();
		document.getElementById('c15t-dialog-host')?.remove();
	});
	return client;
};

/** Open the dialog through a stand-in adapter and return what it got. */
const openWithRecordingAdapter = async function openWithRecordingAdapter(
	options: Partial<C15tAstroOptions>
): Promise<ConsentDialogContext> {
	const mount = vi.fn((_context: ConsentDialogContext) =>
		Promise.resolve({ close: () => undefined, destroy: () => undefined })
	);
	registerDialogAdapter('svelte', () =>
		Promise.resolve({ mount, name: 'svelte' })
	);
	await bootClient(options).openDialog();
	const context = mount.mock.calls[0]?.[0];
	if (!context) {
		throw new Error('The dialog adapter was never mounted.');
	}
	return context;
};

describe('disableAnimation on the dialog island', () => {
	it.each([
		{ attribute: undefined, expected: undefined, option: undefined },
		{ attribute: undefined, expected: true, option: true },
		{ attribute: 'true', expected: true, option: undefined },
		{ attribute: 'false', expected: false, option: true },
	] as const)(
		'is $expected with integration option $option and prop $attribute',
		async ({ attribute, expected, option }) => {
			renderDialogHost(attribute);
			const context = await openWithRecordingAdapter({
				disableAnimation: option,
			});
			expect(context.options.disableAnimation).toBe(expected);
			expect(
				buildProviderProps(context.runtime, context.options).options
					.disableAnimation
			).toBe(expected);
		}
	);

	it('stops the Vue dialog animation', async () => {
		registerDialogAdapter('vue', () => Promise.resolve(vueDialogAdapter));
		registerDialogSurface(
			'vue',
			() => import('../components/islands/panel-surface.vue')
		);
		renderDialogHost('true');
		await bootClient({ ui: 'vue' }).openDialog();

		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-slot="dialog-positioner"]')
			).not.toBeNull()
		);
		expect(
			document
				.querySelector('[data-slot="dialog-positioner"]')
				?.hasAttribute('data-disable-animation')
		).toBe(true);
	});
});
