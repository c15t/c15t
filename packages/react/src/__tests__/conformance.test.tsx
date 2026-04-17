/**
 * React conformance entry point.
 *
 * Drives the shared `runConformanceSuite` against real React renders:
 * - `mount` boots a `ConsentManagerProvider` in offline mode around the
 *   requested component via `createRoot`.
 * - `getStore` pulls the cached store from `getOrCreateConsentRuntime` —
 *   same cacheKey as the provider, so the store suite observes the same
 *   state the UI is rendering.
 * - `serverRender` calls `renderToString` on the same tree.
 *
 * IAB variants still throw `DriverNotImplementedError`: they require a
 * CMP ID and GVL setup that are out of scope for this parity pass. The
 * suites flip them to `[todo]` automatically.
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
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
import { ConsentWidget } from '~/components/consent-widget';
import { ConsentManagerProvider } from '~/providers/consent-manager-provider';
import { version } from '~/version';

function renderFor(component: MountableComponent): ReactElement {
	switch (component) {
		case 'consent-banner':
			return <ConsentBanner />;
		case 'consent-dialog':
			return <ConsentDialog />;
		case 'consent-widget':
			return <ConsentWidget />;
		case 'iab-consent-banner':
		case 'iab-consent-dialog':
			throw new DriverNotImplementedError('react', `mount(${component})`);
	}
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
	framework: 'react',
	async mount(opts: MountOptions): Promise<MountResult> {
		clearConsentRuntimeCache();
		const options = buildProviderOptions(opts);
		lastOptions = options;

		const container = document.createElement('div');
		document.body.appendChild(container);

		const root: Root = createRoot(container);
		root.render(
			<ConsentManagerProvider options={options}>
				{renderFor(opts.component)}
			</ConsentManagerProvider>
		);
		// Flush scheduled effects (subscription, hydration transition).
		await new Promise((r) => setTimeout(r, 0));

		// Force the surface visible so the banner/dialog actually mounts in
		// offline mode (default activeUI is 'none'). Widgets render regardless.
		const { consentStore } = getOrCreateConsentRuntime(options, {
			pkg: '@c15t/react',
			version,
		});
		if (opts.component === 'consent-banner') {
			consentStore.getState().setActiveUI('banner', { force: true });
		} else if (opts.component === 'consent-dialog') {
			consentStore.getState().setActiveUI('dialog');
		}
		await new Promise((r) => setTimeout(r, 0));

		return {
			root: container,
			unmount: async () => {
				root.unmount();
				await new Promise((r) => setTimeout(r, 0));
				container.remove();
				lastOptions = null;
			},
		};
	},
	getStore() {
		if (!lastOptions) {
			throw new Error('React driver: getStore called before mount');
		}
		const { consentStore } = getOrCreateConsentRuntime(lastOptions, {
			pkg: '@c15t/react',
			version,
		});
		return {
			getState: () =>
				consentStore.getState() as unknown as Record<string, unknown>,
			subscribe: (listener) => consentStore.subscribe(listener),
		};
	},
	async serverRender(opts: MountOptions): Promise<string> {
		const options = buildProviderOptions(opts);
		return renderToString(
			<ConsentManagerProvider options={options}>
				{renderFor(opts.component)}
			</ConsentManagerProvider>
		);
	},
};

const api: SuiteApi = {
	describe,
	test,
	expect: expect as unknown as SuiteApi['expect'],
};

runConformanceSuite(driver, api);
