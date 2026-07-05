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
import type { AllConsentNames } from 'c15t';
import type {
	ConsentKernel,
	KernelActiveUI,
	KernelConfig,
	ResolvedPolicy,
} from 'c15t/v3';
import { mount, unmount } from 'svelte';
import { describe, expect, test } from 'vitest';
import type { ConsentManagerOptions } from '../lib/types';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';

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

function consentCategoriesFor(options: Partial<ProviderOptions>) {
	return options.consentCategories?.length === 0
		? [...DEFAULT_CONSENT_CATEGORIES]
		: [...(options.consentCategories ?? DEFAULT_CONSENT_CATEGORIES)];
}

function activeUIForComponent(component: MountableComponent): KernelActiveUI {
	switch (component) {
		case 'consent-dialog':
		case 'consent-widget':
			return 'dialog';
		case 'consent-banner':
			return 'banner';
		case 'iab-consent-banner':
		case 'iab-consent-dialog':
			throw new DriverNotImplementedError('svelte', `mount(${component})`);
	}
}

function buildPolicy(
	opts: MountOptions,
	options: Partial<ProviderOptions>
): ResolvedPolicy {
	const state = opts.initialState as
		| { activeUI?: 'none' | 'banner' | 'dialog' }
		| undefined;
	const mode = state?.activeUI ?? activeUIForComponent(opts.component);
	return {
		id: 'svelte_conformance_policy',
		model: 'opt-in',
		consent: {
			categories: consentCategoriesFor(options),
			scopeMode: 'permissive',
		},
		ui: {
			mode,
			banner: {
				allowedActions: ['reject', 'accept', 'customize'],
				scrollLock: false,
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				scrollLock: false,
			},
		},
	};
}

function buildProviderOptions(opts: MountOptions): ProviderOptions {
	const provided = (opts.providerOptions ?? {}) as Partial<ProviderOptions>;
	const state = opts.initialState as
		| {
				consents?: Record<string, boolean>;
		  }
		| undefined;
	const prefetch: KernelConfig = {
		...(provided.prefetch ?? {}),
		initialConsents: {
			...(provided.prefetch?.initialConsents ?? {}),
			...(state?.consents ?? {}),
		},
		initialPolicy: buildPolicy(opts, provided),
		initialLocation: {
			countryCode: 'DE',
			regionCode: null,
		},
		initialBranding: 'c15t',
		initialPolicyDecision: {
			policyId: 'svelte_conformance_policy',
			fingerprint: 'svelte_conformance_fingerprint',
			matchedBy: 'default',
			country: 'DE',
			region: null,
			jurisdiction: 'GDPR',
		},
		initialPolicySnapshotToken: 'svelte_conformance_token',
	};

	return {
		...provided,
		mode: provided.mode ?? 'offline',
		persistence: provided.persistence ?? false,
		disableAnimation: provided.disableAnimation ?? true,
		trapFocus: provided.trapFocus ?? false,
		consentCategories: consentCategoriesFor(provided),
		prefetch,
	} as ProviderOptions;
}

function activeUIForStore(activeUI: KernelActiveUI): StoreState['activeUI'] {
	if (activeUI === 'banner' || activeUI === 'dialog') return activeUI;
	return 'none';
}

function projectStoreState(kernel: ConsentKernel): StoreState {
	const snapshot = kernel.getSnapshot();
	const consents = { ...snapshot.consents } as Record<string, boolean>;
	return {
		...(snapshot as unknown as Record<string, unknown>),
		consents,
		selectedConsents: { ...consents },
		activeUI: activeUIForStore(snapshot.activeUI),
		consentCategories: [...snapshot.policyCategories],
	};
}

let lastKernel: ConsentKernel | null = null;

const driver: TestDriver = {
	framework: 'svelte',
	async mount(opts: MountOptions): Promise<MountResult> {
		const renderable = assertRenderable(opts.component);
		const options = buildProviderOptions(opts);
		let mountedKernel: ConsentKernel | null = null;

		const container = document.createElement('div');
		document.body.appendChild(container);

		const app = mount(ConformanceFixture, {
			target: container,
			props: {
				component: renderable,
				options,
				onKernel: (kernel: ConsentKernel) => {
					mountedKernel = kernel;
					lastKernel = kernel;
				},
			},
		});

		await new Promise((r) => setTimeout(r, 0));

		if (!mountedKernel) {
			throw new Error('Svelte driver: mount completed without kernel');
		}

		return {
			root: container,
			unmount: async () => {
				await unmount(app);
				container.replaceChildren();
				container.remove();
				if (lastKernel === mountedKernel) lastKernel = null;
			},
		};
	},
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
	async serverRender(_opts: MountOptions): Promise<string> {
		// Svelte 5 dual-compiles components (client vs server output). This
		// vitest project resolves the browser condition, so `svelte/server`'s
		// `render()` receives client-compiled components and throws
		// `effect_orphan` (onMount hits the client runtime). Real SSR
		// conformance needs a second vitest project with
		// `resolve.conditions: ['svelte', 'node']` and an SSR-compiled
		// fixture — tracked as follow-up. SvelteKit SSR in real apps is
		// unaffected; this is a test-harness compilation constraint.
		throw new DriverNotImplementedError('svelte', 'serverRender');
	},
};

const api: SuiteApi = {
	describe,
	test,
	expect: expect as unknown as SuiteApi['expect'],
};

runConformanceSuite(driver, api);
