/**
 * Svelte conformance entry point.
 *
 * Drives the shared `runConformanceSuite` against real Svelte renders:
 * - `mount` boots a fixture that wraps the requested component in
 *   `ConsentManagerProvider` (provider takes a `children` snippet, so
 *   each component variant needs a dispatching fixture).
 * - `getStore` projects the provider's live kernel snapshot into the
 *   v2-compatible shape asserted by the shared suite.
 * - `serverRender` invokes `svelte/server.render` against the same fixture.
 *
 * IAB variants mount the real `IABConsentBanner`/`IABConsentDialog` with the
 * shared minimal GVL fixture and an `iab` policy (the provider's `iab`
 * option wires `createIAB` exactly like production).
 */

import {
	DriverNotImplementedError,
	IAB_FIXTURE_CMP_ID,
	IAB_FIXTURE_CMP_VERSION,
	MINIMAL_GVL,
	runConformanceSuite,
} from '@c15t/conformance';
import type {
	MountableComponent,
	MountOptions,
	MountResult,
	SuiteApi,
	TestDriver,
} from '@c15t/conformance';
import type {
	AllConsentNames,
	ConsentKernel,
	KernelActiveUI,
	KernelConfig,
	ResolvedPolicy,
} from '@c15t/core';
import type { GlobalVendorList } from '@c15t/schema/types';
import { mount, unmount } from 'svelte';
import { describe, expect, test } from 'vitest';

import { whenIABReady } from '../lib/iab-loader';
import { offline } from '../lib/transports/offline';
import type { ConsentManagerOptions } from '../lib/types';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
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
};

type ProviderOptions = ConsentManagerOptions;

type StoreState = Record<string, unknown> & {
	consents: Record<string, boolean>;
	selectedConsents: Record<string, boolean>;
	activeUI: 'none' | 'banner' | 'dialog';
	consentCategories: string[];
};

const DEFAULT_CONSENT_CATEGORIES = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] as const satisfies readonly AllConsentNames[];

const isIabComponent = function isIabComponent(
	component: MountableComponent
): boolean {
	return (
		component === 'iab-consent-banner' || component === 'iab-consent-dialog'
	);
};

const consentCategoriesFor = function consentCategoriesFor(
	options: Partial<ProviderOptions>
) {
	return options.consentCategories?.length === 0
		? [...DEFAULT_CONSENT_CATEGORIES]
		: [...(options.consentCategories ?? DEFAULT_CONSENT_CATEGORIES)];
};

const activeUIForComponent = function activeUIForComponent(
	component: MountableComponent
): KernelActiveUI {
	switch (component) {
		case 'consent-dialog':
		case 'consent-widget':
		case 'iab-consent-dialog':
			return 'dialog';
		case 'consent-banner':
		case 'iab-consent-banner':
			return 'banner';
		default:
			throw new DriverNotImplementedError('svelte', `mount(${component})`);
	}
};

const buildPolicy = function buildPolicy(
	opts: MountOptions,
	options: Partial<ProviderOptions>
): ResolvedPolicy {
	const state = opts.initialState as
		| { activeUI?: 'none' | 'banner' | 'dialog' }
		| undefined;
	const mode = state?.activeUI ?? activeUIForComponent(opts.component);
	const consent: ResolvedPolicy['consent'] = {
		categories: consentCategoriesFor(options),
		scopeMode: 'permissive',
	};
	if (opts.policy?.respectGpc !== undefined) {
		consent.gpc = opts.policy.respectGpc;
	}

	return {
		consent,
		id: 'svelte_conformance_policy',
		model: isIabComponent(opts.component)
			? 'iab'
			: (opts.policy?.model ?? 'opt-in'),
		ui: {
			banner: {
				allowedActions: ['reject', 'accept', 'customize'],
				scrollLock: false,
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				scrollLock: false,
			},
			mode,
		},
	};
};

const buildProviderOptions = function buildProviderOptions(
	opts: MountOptions
): ProviderOptions {
	if (opts.initMode) {
		// Pending: implement request-lifecycle once the Svelte provider exposes an
		// equivalent initialPolicyProvisional path for deferred transport init.
		throw new DriverNotImplementedError(
			'svelte',
			`request lifecycle initMode (${opts.initMode})`
		);
	}
	const provided = (opts.providerOptions ?? {}) as Partial<ProviderOptions>;
	const state = opts.initialState as
		| {
				consents?: Record<string, boolean>;
				hasConsented?: boolean;
		  }
		| undefined;
	const prefetch: KernelConfig = {
		...(provided.prefetch ?? {}),
		initialBranding: 'c15t',
		initialConsents: {
			...(provided.prefetch?.initialConsents ?? {}),
			...(state?.consents ?? {}),
		},
		initialHasConsented:
			state?.hasConsented ?? provided.prefetch?.initialHasConsented,
		initialLocation: {
			countryCode: 'DE',
			regionCode: null,
		},
		initialPolicy: buildPolicy(opts, provided),
		initialPolicyDecision: {
			country: 'DE',
			fingerprint: 'svelte_conformance_fingerprint',
			jurisdiction: 'GDPR',
			matchedBy: 'default',
			policyId: 'svelte_conformance_policy',
			region: null,
		},
		initialPolicySnapshotToken: 'svelte_conformance_token',
	};

	const options = {
		...provided,
		consentCategories: consentCategoriesFor(provided),
		disableAnimation: provided.disableAnimation ?? true,
		mode: provided.mode ?? offline(),
		persistence: opts.persistence ?? provided.persistence ?? false,
		prefetch,
		trapFocus: provided.trapFocus ?? false,
	} as ProviderOptions;
	// GPC flows through the public `overrides` option — the same input an
	// embedding app uses — which the provider merges into the kernel's
	// `initialOverrides` (consent-manager-provider.svelte).
	if (opts.gpc !== undefined) {
		options.overrides = { gpc: opts.gpc };
	}
	// Real IAB wiring: the provider normalizes this into `createIAB`,
	// which seeds the kernel's IAB slice (enabled + GVL + CMP id).
	if (isIabComponent(opts.component)) {
		options.iab = {
			cmpId: IAB_FIXTURE_CMP_ID,
			cmpVersion: IAB_FIXTURE_CMP_VERSION,
			enabled: true,
			gvl: MINIMAL_GVL as unknown as GlobalVendorList,
		};
	}

	return options;
};

const activeUIForStore = function activeUIForStore(
	activeUI: KernelActiveUI
): StoreState['activeUI'] {
	if (activeUI === 'banner' || activeUI === 'dialog') {
		return activeUI;
	}
	return 'none';
};

const projectStoreState = function projectStoreState(
	kernel: ConsentKernel
): StoreState {
	const snapshot = kernel.getSnapshot();
	const consents = { ...snapshot.consents } as Record<string, boolean>;
	return {
		...(snapshot as unknown as Record<string, unknown>),
		activeUI: activeUIForStore(snapshot.activeUI),
		consentCategories: [...snapshot.policyCategories],
		consents,
		selectedConsents: { ...consents },
	};
};

let lastKernel: ConsentKernel | null = null;

const driver: TestDriver = {
	framework: 'svelte',
	getStore() {
		if (!lastKernel) {
			throw new Error('Svelte driver: getStore called before mount');
		}
		return {
			getState: () => projectStoreState(lastKernel as ConsentKernel),
			subscribe: (listener) =>
				(lastKernel as ConsentKernel).subscribe(() => {
					listener();
				}),
		};
	},
	async mount(opts: MountOptions): Promise<MountResult> {
		const options = buildProviderOptions(opts);
		let mountedKernel: ConsentKernel | null = null;

		const container = document.createElement('div');
		document.body.appendChild(container);

		const app = mount(ConformanceFixture, {
			props: {
				component: opts.component,
				onKernel: (kernel: ConsentKernel) => {
					mountedKernel = kernel;
					lastKernel = kernel;
				},
				options,
			},
			target: container,
		});

		if (isIabComponent(opts.component)) {
			// `@c15t/iab` is loaded on demand, so an IAB surface only has a
			// live handle once that import has settled — the same wait an
			// embedding app does before opening a TCF dialog.
			await whenIABReady();
		}
		await createDeferredPromise((r) => setTimeout(r, 0));

		if (!mountedKernel) {
			throw new Error('Svelte driver: mount completed without kernel');
		}

		return {
			root: container,
			unmount: async () => {
				await unmount(app);
				container.replaceChildren();
				container.remove();
				if (lastKernel === mountedKernel) {
					lastKernel = null;
				}
			},
		};
	},
	serverRender(_opts: MountOptions): Promise<string> {
		if (_opts.initMode) {
			// Pending: see buildProviderOptions; SSR also needs an SSR-compiled
			// fixture before this lifecycle contract can run for Svelte.
			return Promise.reject(
				new DriverNotImplementedError(
					'svelte',
					`request lifecycle initMode (${_opts.initMode})`
				)
			);
		}
		// Svelte 5 dual-compiles components (client vs server output). This
		// vitest project resolves the browser condition, so `svelte/server`'s
		// `render()` receives client-compiled components and throws
		// `effect_orphan` (onMount hits the client runtime). Real SSR
		// conformance needs a second vitest project with
		// `resolve.conditions: ['svelte', 'node']` and an SSR-compiled
		// fixture — tracked as follow-up. SvelteKit SSR in real apps is
		// unaffected; this is a test-harness compilation constraint.
		return Promise.reject(
			new DriverNotImplementedError('svelte', 'serverRender')
		);
	},
};

const api: SuiteApi = {
	describe,
	expect: expect as unknown as SuiteApi['expect'],
	test,
};

runConformanceSuite(driver, api);
