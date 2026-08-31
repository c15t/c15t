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
	runConformanceSuite,
} from '@c15t/conformance';
import type {
	MountableComponent,
	MountOptions,
	MountResult,
	SuiteApi,
	TestDriver,
} from '@c15t/conformance';
import {
	clearConsentRuntimeCache,
	getOrCreateConsentRuntime,
} from '@c15t/core';
import type { ConsentManagerOptions } from '@c15t/core';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
import { ConsentWidget } from '~/components/consent-widget';
import { ConsentManagerProvider } from '~/providers/consent-manager-provider';
import { version } from '~/version';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
}

function renderFor(component: MountableComponent): ReactElement {
	switch (component) {
		case 'consent-banner':
			return (
				<>
					<ConsentBanner />
					<ConsentDialog />
				</>
			);
		case 'consent-dialog':
			return <ConsentDialog />;
		case 'consent-widget':
			return <ConsentWidget />;
		case 'iab-consent-banner':
		case 'iab-consent-dialog':
			throw new DriverNotImplementedError('react', `mount(${component})`);
	}
}

/**
 * Offline policy fixture used when a mount shapes the policy (GPC suite)
 * or exercises persistence. `ui.mode: 'banner'` makes the surface follow
 * the real lifecycle instead of the driver's forced `setActiveUI`.
 */
function buildOfflinePolicy(opts: MountOptions) {
	return {
		policy: {
			id: 'react_v2_conformance_policy',
			model: opts.policy?.model ?? 'opt-in',
			consent: {
				categories: [
					'necessary',
					'functionality',
					'experience',
					'measurement',
					'marketing',
				],
				scopeMode: 'permissive',
				...(opts.policy?.respectGpc === undefined
					? {}
					: { gpc: opts.policy.respectGpc }),
			},
			ui: {
				mode: 'banner',
			},
		},
	} as NonNullable<ConsentManagerOptions['offlinePolicy']>;
}

function usesPolicyLifecycle(opts: MountOptions): boolean {
	return Boolean(opts.policy || opts.persistence || opts.gpc !== undefined);
}

function buildProviderOptions(opts: MountOptions): ConsentManagerOptions {
	if (opts.initMode) {
		throw new DriverNotImplementedError(
			'react',
			`request lifecycle initMode (${opts.initMode}) is implemented by the v3 conformance driver only`
		);
	}
	const provided = (opts.providerOptions ??
		{}) as Partial<ConsentManagerOptions>;
	return {
		mode: 'offline',
		...(usesPolicyLifecycle(opts)
			? {
					offlinePolicy: buildOfflinePolicy(opts),
					// v2 defaults `consentCategories` to `['necessary']`; real apps
					// configure the categories they use, and `saveConsents('all')`
					// only grants configured categories.
					consentCategories: [
						'necessary',
						'functionality',
						'experience',
						'measurement',
						'marketing',
					] as ConsentManagerOptions['consentCategories'],
				}
			: {}),
		...provided,
	} as ConsentManagerOptions;
}

/**
 * Stub `navigator.globalPrivacyControl` — the v2 runtime reads the browser
 * signal directly via `hasGlobalPrivacyControlSignal()`. Returns a restore
 * function.
 */
function stubGpcSignal(value: boolean): () => void {
	const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
	const hadOwn = Object.hasOwn(nav, 'globalPrivacyControl');
	const previous = nav.globalPrivacyControl;
	Object.defineProperty(nav, 'globalPrivacyControl', {
		value,
		configurable: true,
	});
	return () => {
		if (hadOwn) {
			Object.defineProperty(nav, 'globalPrivacyControl', {
				value: previous,
				configurable: true,
			});
		} else {
			delete nav.globalPrivacyControl;
		}
	};
}

/**
 * Seed the v2 storage payload for `initialState` mounts. This is the same
 * `c15t` localStorage entry the runtime writes via `saveConsentToStorage`,
 * so the store hydrates it through its real read path.
 */
function seedStoredConsent(opts: MountOptions): () => void {
	const state = opts.initialState as
		| { consents?: Record<string, boolean>; hasConsented?: boolean }
		| undefined;
	if (!state?.hasConsented || !state.consents) {
		return () => {};
	}
	localStorage.setItem(
		'c15t',
		JSON.stringify({
			consents: state.consents,
			consentInfo: { time: Date.now(), type: 'all' },
		})
	);
	return () => {
		localStorage.removeItem('c15t');
	};
}

let lastOptions: ConsentManagerOptions | null = null;

const driver: TestDriver = {
	framework: 'react',
	async mount(opts: MountOptions): Promise<MountResult> {
		clearConsentRuntimeCache();
		const restoreGpc = opts.gpc === undefined ? null : stubGpcSignal(opts.gpc);
		const removeSeededConsent = seedStoredConsent(opts);
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
		await createDeferredPromise((r) => setTimeout(r, 0));

		// Force the surface visible so the banner/dialog actually mounts in
		// offline mode (default activeUI is 'none'). Widgets render regardless.
		// Policy-lifecycle mounts (gpc / persistence / shaped policy) skip the
		// force: their offline policy drives activeUI through the real flow.
		const { consentStore } = getOrCreateConsentRuntime(options, {
			pkg: '@c15t/react',
			version,
		});
		if (!usesPolicyLifecycle(opts)) {
			if (opts.component === 'consent-banner') {
				consentStore.getState().setActiveUI('banner', { force: true });
			} else if (opts.component === 'consent-dialog') {
				consentStore.getState().setActiveUI('dialog');
			}
		}
		await createDeferredPromise((r) => setTimeout(r, 0));

		return {
			root: container,
			unmount: async () => {
				root.unmount();
				await createDeferredPromise((r) => setTimeout(r, 0));
				container.remove();
				removeSeededConsent();
				restoreGpc?.();
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
		if (opts.initMode) {
			throw new DriverNotImplementedError(
				'react',
				`request lifecycle initMode (${opts.initMode}) is implemented by the v3 conformance driver only`
			);
		}
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
