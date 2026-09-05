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
	InitResponse,
} from '@c15t/core';
import { custom } from '@c15t/core';
import type { GlobalVendorList } from '@c15t/schema/types';
import {
	normalizePolicyRule,
	createPolicyRuleFingerprints,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { mount, unmount } from 'svelte';
import { describe, expect, test } from 'vitest';

import { offline } from '../lib/transports/offline';
import type { ConsentManagerOptions } from '../lib/types';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';
import { createPolicySession, probePolicyContract } from './policy-driver';
import { renderSsr } from './server-render';

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

const buildProviderOptions = function buildProviderOptions(
	opts: MountOptions
): ProviderOptions {
	const provided = (opts.providerOptions ?? {}) as Partial<ProviderOptions>;
	const rule = normalizePolicyRule({
		categories: consentCategoriesFor(provided).filter(
			(name) => name !== 'necessary'
		),
		id: 'svelte_conformance_policy',
		match: { fallback: true },
		model: isIabComponent(opts.component)
			? 'iab'
			: (opts.policy?.model ?? 'opt-in'),
		privacySignals: {
			gpc: {
				denyCategories: opts.policy?.respectGpc
					? ['marketing', 'measurement']
					: [],
			},
		},
		prompt: 'choice',
	});
	const resolution = {
		fingerprints: createPolicyRuleFingerprints(rule),
		matchedBy: 'fallback' as const,
		policy: rule,
		policyId: rule.id,
		status: 'matched' as const,
	};
	const prefetch: KernelConfig = {
		...(provided.prefetch ?? {}),
		initialBranding: 'c15t',
		initialPolicyPending:
			opts.initMode === 'pending' || opts.initMode === 'failing',
		initialPolicyResolution:
			opts.initMode === 'pending' || opts.initMode === 'failing'
				? undefined
				: resolution,
		initialPrivacySignals: { gpc: opts.gpc },
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
	const consents = { ...snapshot.effectivePermissions } as Record<
		string,
		boolean
	>;
	return {
		...(snapshot as unknown as Record<string, unknown>),
		activeUI: activeUIForStore(snapshot.activeUI),
		consentCategories: [...snapshot.policyRule.scope],
		consents,
		selectedConsents: { ...consents },
	};
};

let lastKernel: ConsentKernel | null = null;

const driver: TestDriver = {
	createPolicySession,
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
		let resolveInit: (() => void) | undefined;
		if (opts.initMode === 'pending') {
			const resolution = buildProviderOptions({
				...opts,
				initMode: 'authoritative',
			}).prefetch?.initialPolicyResolution;
			const promise = createDeferredPromise<InitResponse>((resolve) => {
				resolveInit = () =>
					resolve({
						policyResolution: writePolicyResolutionWire(
							resolution ?? { policy: null, status: 'unconfigured' }
						),
					});
			});
			options.mode = custom({ init: () => promise });
		} else if (opts.initMode === 'failing') {
			options.mode = custom({
				init: () => Promise.reject(new Error('Init failed')),
			});
		}

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

		await createDeferredPromise((r) => setTimeout(r, 0));

		if (!mountedKernel) {
			throw new Error('Svelte driver: mount completed without kernel');
		}

		return {
			resolveInit: resolveInit
				? async () => {
						resolveInit?.();
						await createDeferredPromise((resolve) => {
							setTimeout(resolve, 0);
						});
					}
				: undefined,
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
	probePolicyContract,
	serverRender(opts: MountOptions): Promise<string> {
		const options = buildProviderOptions(opts);
		return renderSsr(
			{ component: opts.component, options: { ...options, mode: undefined } },
			'conformance-fixture.svelte'
		).then((result) => result.html);
	},
};

const api: SuiteApi = {
	describe,
	expect: expect as unknown as SuiteApi['expect'],
	test,
};

runConformanceSuite(driver, api);
