/**
 * Svelte conformance entry point.
 *
 * Drives the shared `runConformanceSuite` against real Svelte renders:
 * - `mount` boots a fixture that wraps the requested component in
 *   `ConsentManagerProvider` (provider takes a `children` snippet, so
 *   each component variant needs a dispatching fixture).
 * - `getStore` pulls the cached store from `getOrCreateConsentRuntime`.
 * - `serverRender` invokes `svelte/server.render` against the same fixture.
 *
 * IAB variants still throw `DriverNotImplementedError` — they need CMP ID
 * + GVL wiring that isn't worth fanning out the conformance matrix for yet.
 */

import {
	DriverNotImplementedError,
	type MountableComponent,
	type MountOptions,
	type MountResult,
	runConformanceSuite,
	type SuiteApi,
	type TestDriver,
} from '@c15t/conformance';
import {
	type ConsentManagerOptions,
	clearConsentRuntimeCache,
	getOrCreateConsentRuntime,
} from 'c15t';
import { mount, unmount } from 'svelte';
import { describe, expect, test } from 'vitest';
import { version } from '~/version';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';

function assertRenderable(
	component: MountableComponent
): 'consent-banner' | 'consent-dialog' | 'consent-widget' {
	if (
		component === 'iab-consent-banner' ||
		component === 'iab-consent-dialog'
	) {
		throw new DriverNotImplementedError('svelte', `mount(${component})`);
	}
	return component;
}

function buildProviderOptions(opts: MountOptions): ConsentManagerOptions {
	const provided = (opts.providerOptions ??
		{}) as Partial<ConsentManagerOptions>;
	return {
		mode: 'offline',
		...provided,
	} as ConsentManagerOptions;
}

let lastOptions: ConsentManagerOptions | null = null;

const driver: TestDriver = {
	framework: 'svelte',
	async mount(opts: MountOptions): Promise<MountResult> {
		const renderable = assertRenderable(opts.component);
		clearConsentRuntimeCache();
		const options = buildProviderOptions(opts);
		lastOptions = options;

		const container = document.createElement('div');
		document.body.appendChild(container);

		const app = mount(ConformanceFixture, {
			target: container,
			props: { component: renderable, options },
		});

		// Flush microtasks so $effects have a chance to run before assertions.
		await new Promise((r) => setTimeout(r, 0));

		// Force the surface visible — default activeUI in offline mode is 'none',
		// which hides the banner/dialog components entirely.
		const { consentStore } = getOrCreateConsentRuntime(options, {
			pkg: '@c15t/svelte',
			version,
		});
		if (renderable === 'consent-banner') {
			consentStore.getState().setActiveUI('banner', { force: true });
		} else if (renderable === 'consent-dialog') {
			consentStore.getState().setActiveUI('dialog');
		}
		await new Promise((r) => setTimeout(r, 0));

		return {
			root: container,
			unmount: async () => {
				await unmount(app);
				container.remove();
				lastOptions = null;
			},
		};
	},
	getStore() {
		if (!lastOptions) {
			throw new Error('Svelte driver: getStore called before mount');
		}
		const { consentStore } = getOrCreateConsentRuntime(lastOptions, {
			pkg: '@c15t/svelte',
			version,
		});
		return {
			getState: () =>
				consentStore.getState() as unknown as Record<string, unknown>,
			subscribe: (listener) => consentStore.subscribe(listener),
		};
	},
	async serverRender(_opts: MountOptions): Promise<string> {
		// ConsentManagerProvider uses `$effect` at component init, which is a
		// client-only rune. `svelte/server.render` throws `effect_orphan`
		// when that runs in SSR. Marked as todo until the provider is made
		// SSR-safe (e.g. by guarding $effect behind `if (typeof window)` or
		// moving the subscription into onMount).
		throw new DriverNotImplementedError('svelte', 'serverRender');
	},
};

const api: SuiteApi = {
	describe,
	test,
	expect: expect as unknown as SuiteApi['expect'],
};

runConformanceSuite(driver, api);
