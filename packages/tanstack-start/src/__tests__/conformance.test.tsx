/**
 * TanStack Start conformance entry point.
 *
 * This driver targets the exported @c15t/tanstack-start surface: the tanstack-start-specific
 * `ConsentBoundary` (which forwards a server-produced `KernelConfig` to the
 * React provider) plus the UI components and hooks the package re-exports
 * from `@c15t/react`. Running the shared suite here validates both the
 * re-export and the tanstack-start-specific wrapping.
 *
 * Deliberate differences from the React driver:
 * - The provider layer is `ConsentBoundary`, not `ConsentProvider`, so the
 *   tanstack-start `config` -> `options.prefetch` plumbing is on the tested path.
 * - `KernelContext` is not part of the public surface, so the store is
 *   observed through the public `useSnapshot` hook via a bridge component
 *   instead of reading the kernel directly.
 * - We import from `~/boundary` and `@c15t/react` (the exact module
 *   `@c15t/tanstack-start` re-exports with `export *`) rather than `~/index`,
 *   because the barrel is the same surface and the server entry needs a
 *   real TanStack Start request context. Existing adapter tests follow the
 *   same convention.
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
import type {
	AllConsentNames,
	KernelActiveUI,
	KernelConfig,
	ResolvedPolicy,
	TranslationsResponse,
} from '@c15t/core';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentWidget,
	custom,
	useSnapshot,
} from '@c15t/react';
import type { ConsentSnapshot } from '@c15t/react';
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { ConsentBoundary } from '~/boundary';
import type { ConsentBoundaryProps } from '~/boundary';

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

const createVoidDeferredPromise = function createVoidDeferredPromise(
	run: (
		resolve: () => void,
		reject: DeferredPromise<undefined>['reject']
	) => void
): Promise<void> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<undefined>();
	run(() => deferred.resolve(undefined), deferred.reject);
	return deferred.promise;
};

type BoundaryOptions = NonNullable<ConsentBoundaryProps['options']>;

type ProviderOptions = BoundaryOptions & {
	consentCategories?: AllConsentNames[];
	prefetch?: KernelConfig;
	i18n?: {
		locale?: string;
		messages?: Record<string, Partial<TranslationsResponse>>;
	};
	initialTranslationConfig?: {
		defaultLanguage?: string;
		translations?: Record<string, Partial<TranslationsResponse>> | null;
	};
};

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

const DEFAULT_TRANSLATIONS: TranslationsResponse = {
	common: {
		acceptAll: 'Accept all',
		customize: 'Customize',
		rejectAll: 'Reject all',
		save: 'Save',
	},
	consentManagerDialog: {
		description: 'Manage your choices.',
		title: 'Privacy preferences',
	},
	consentTypes: {
		experience: {
			description: 'Experience cookies.',
			title: 'Experience',
		},
		functionality: {
			description: 'Feature cookies.',
			title: 'Functionality',
		},
		marketing: {
			description: 'Targeted advertising.',
			title: 'Marketing',
		},
		measurement: {
			description: 'Analytics and performance measurement.',
			title: 'Measurement',
		},
		necessary: {
			description: 'Required for the site to function.',
			title: 'Necessary',
		},
	},
	cookieBanner: {
		description: 'We use cookies to enhance your experience.',
		title: 'We value your privacy',
	},
	frame: {
		actionButton: 'Manage',
		title: 'Privacy',
	},
	legalLinks: {
		cookiePolicy: 'Cookie policy',
		privacyPolicy: 'Privacy policy',
		termsOfService: 'Terms of service',
	},
};

const mergeTranslations = function mergeTranslations(
	base: TranslationsResponse,
	override: Partial<TranslationsResponse> | undefined
): TranslationsResponse {
	if (!override || typeof override !== 'object') {
		return base;
	}
	return {
		...base,
		...override,
		common: { ...base.common, ...override.common },
		consentManagerDialog: {
			...base.consentManagerDialog,
			...override.consentManagerDialog,
		},
		consentTypes: {
			...base.consentTypes,
			...override.consentTypes,
		},
		cookieBanner: { ...base.cookieBanner, ...override.cookieBanner },
		frame: { ...base.frame, ...override.frame },
		legalLinks: { ...base.legalLinks, ...override.legalLinks },
	};
};

const resolveTranslations = function resolveTranslations(
	options: ProviderOptions,
	locale?: string
) {
	const language =
		locale ??
		options.i18n?.locale ??
		options.initialTranslationConfig?.defaultLanguage ??
		'en';
	const messages = options.i18n?.messages;
	const legacyMessages = options.initialTranslationConfig?.translations;
	const override =
		messages?.[language] ??
		messages?.en ??
		(legacyMessages && typeof legacyMessages === 'object'
			? (legacyMessages[language] ?? legacyMessages.en)
			: undefined);

	return {
		language,
		translations: mergeTranslations(DEFAULT_TRANSLATIONS, override),
	};
};

const consentCategoriesFor = function consentCategoriesFor(
	options: ProviderOptions
): AllConsentNames[] {
	return options.consentCategories?.length === 0
		? [...DEFAULT_CONSENT_CATEGORIES]
		: [...(options.consentCategories ?? DEFAULT_CONSENT_CATEGORIES)];
};

const activeUIForComponent = function activeUIForComponent(
	component: MountableComponent
): 'banner' | 'dialog' {
	switch (component) {
		case 'consent-dialog':
		case 'consent-widget':
			return 'dialog';
		case 'consent-banner':
			return 'banner';
		case 'iab-consent-banner':
		case 'iab-consent-dialog':
			// @c15t/tanstack-start does not re-export the IAB components.
			throw new DriverNotImplementedError(
				'tanstack-start',
				`mount(${component})`
			);
		default:
			throw new DriverNotImplementedError(
				'tanstack-start',
				`mount(${component})`
			);
	}
};

const buildPolicy = function buildPolicy(
	opts: MountOptions,
	options: ProviderOptions
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
		id: 'tanstack_start_conformance_policy',
		model: opts.policy?.model ?? 'opt-in',
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

/**
 * Split the suite-provided provider options into the two channels the
 * tanstack-start surface exposes: the serializable `config` prop (what a Server
 * Component would produce) and the remaining client provider options.
 */
const buildBoundaryProps = function buildBoundaryProps(opts: MountOptions): {
	config: KernelConfig;
	options: BoundaryOptions;
} {
	const provided = (opts.providerOptions ?? {}) as ProviderOptions;
	const state = opts.initialState as
		| {
				consents?: Record<string, boolean>;
				hasConsented?: boolean;
		  }
		| undefined;
	const initMode = opts.initMode ?? 'authoritative';
	const basePrefetch: KernelConfig = {
		...(provided.prefetch ?? {}),
		initialConsents: {
			...(provided.prefetch?.initialConsents ?? {}),
			...(state?.consents ?? {}),
		},
		initialHasConsented:
			state?.hasConsented ?? provided.prefetch?.initialHasConsented,
		initialTranslations: resolveTranslations(provided, opts.locale),
	};
	if (initMode !== 'authoritative') {
		basePrefetch.initialPolicy = buildPolicy(opts, provided);
		basePrefetch.initialPolicyProvisional = true;
	}
	// GPC arrives in the serializable server config — exactly the field
	// the tanstack-start server plumbing derives from the `sec-gpc` header.
	if (opts.gpc !== undefined) {
		basePrefetch.initialOverrides = {
			...(provided.prefetch?.initialOverrides ?? {}),
			gpc: opts.gpc,
		};
	}
	const config: KernelConfig =
		initMode === 'authoritative'
			? {
					...basePrefetch,
					initialBranding: 'c15t',
					initialLocation: {
						countryCode: 'DE',
						regionCode: null,
					},
					initialPolicy: buildPolicy(opts, provided),
					initialPolicyDecision: {
						country: 'DE',
						fingerprint: 'tanstack_start_conformance_fingerprint',
						jurisdiction: 'GDPR',
						matchedBy: 'default',
						policyId: 'tanstack_start_conformance_policy',
						region: null,
					},
					initialPolicySnapshotToken: 'tanstack_start_conformance_token',
				}
			: basePrefetch;

	const { prefetch: _prefetch, ...rest } = provided;
	return {
		config,
		options: {
			...rest,
			consentCategories: consentCategoriesFor(provided),
			disableAnimation: true,
			trapFocus: false,
		},
	};
};

const createPendingInit = function createPendingInit() {
	let resolve!: () => void;
	const promise = createDeferredPromise<Record<string, never>>((settle) => {
		resolve = () => settle({});
	});
	return { promise, resolve };
};

const lifecycleTransportFor = function lifecycleTransportFor(
	opts: MountOptions
) {
	if ((opts.initMode ?? 'authoritative') === 'pending') {
		const deferred = createPendingInit();
		return {
			resolve: deferred.resolve,
			transport: {
				init: () => deferred.promise,
			},
		};
	}
	if (opts.initMode === 'failing') {
		return {
			resolve: undefined,
			transport: {
				init() {
					return Promise.reject(new Error('conformance: init failed'));
				},
			},
		};
	}
	return { resolve: undefined, transport: undefined };
};

const flushScheduler = async function flushScheduler() {
	await createDeferredPromise((resolve) => setTimeout(resolve, 0));
	await createDeferredPromise((resolve) => setTimeout(resolve, 0));
};

/**
 * `ConsentDialog` and `ConsentWidget` on the public surface are lazy
 * (React.lazy + Suspense). After mount, wait for their root to appear so
 * suites can assert against a fully rendered tree. Never throws — if the
 * component legitimately does not render, the suite's own assertion fails
 * with a meaningful message.
 */
const LAZY_COMPONENT_ROOTS: Partial<Record<MountableComponent, string>> = {
	'consent-dialog': '[data-testid="consent-dialog-root"]',
	'consent-widget': '[data-testid="consent-widget-root"]',
};

const waitForLazyComponent = async function waitForLazyComponent(
	component: MountableComponent
): Promise<void> {
	const selector = LAZY_COMPONENT_ROOTS[component];
	if (!selector) {
		return;
	}
	const deadline = Date.now() + 5000;
	const poll = async (): Promise<void> => {
		if (Date.now() >= deadline || document.querySelector(selector)) {
			return;
		}
		await createDeferredPromise((resolve) => setTimeout(resolve, 10));
		await poll();
	};
	await poll();
};

/**
 * The tanstack-start surface does not expose the kernel (no `KernelContext`
 * re-export), so the driver observes the store exclusively through the
 * public `useSnapshot` hook. Each mount gets its own bridge; the bridge
 * records the latest snapshot on every render and notifies suite
 * subscribers after each commit.
 */
interface SnapshotBridge {
	capture: (snapshot: ConsentSnapshot) => void;
	commit: (snapshot: ConsentSnapshot) => void;
	getSnapshot: () => ConsentSnapshot | null;
	subscribe: (listener: () => void) => () => void;
}

const createBridge = function createBridge(): SnapshotBridge {
	let currentSnapshot: ConsentSnapshot | null = null;
	const listeners = new Set<() => void>();

	return {
		capture(snapshot) {
			currentSnapshot = snapshot;
		},
		commit(snapshot) {
			currentSnapshot = snapshot;
			for (const listener of listeners) {
				listener();
			}
		},
		getSnapshot: () => currentSnapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
};

const StoreBridge = ({ bridge }: { bridge: SnapshotBridge }) => {
	const snapshot = useSnapshot();
	// Assign during render (like the React driver's KernelCapture) so
	// getState() is correct immediately after mount settles.
	bridge.capture(snapshot);
	useEffect(() => {
		bridge.commit(snapshot);
	}, [bridge, snapshot]);
	return null;
};

const componentFor = function componentFor(opts: MountOptions): ReactElement {
	const { providerOptions } = opts;
	const trapFocus =
		typeof providerOptions === 'object' &&
		providerOptions !== null &&
		'trapFocus' in providerOptions
			? providerOptions.trapFocus === true
			: false;

	switch (opts.component) {
		case 'consent-banner':
			return (
				<>
					<ConsentBanner
						disableAnimation
						trapFocus={trapFocus}
						hideBranding
					/>
					<ConsentDialog
						disableAnimation
						trapFocus={trapFocus}
						hideBranding
					/>
				</>
			);
		case 'consent-dialog':
			return (
				<ConsentDialog
					disableAnimation
					trapFocus={trapFocus}
					hideBranding
				/>
			);
		case 'consent-widget':
			return <ConsentWidget hideBranding />;
		case 'iab-consent-banner':
		case 'iab-consent-dialog':
			throw new DriverNotImplementedError(
				'tanstack-start',
				`mount(${opts.component})`
			);
		default:
			throw new DriverNotImplementedError(
				'tanstack-start',
				`mount(${opts.component})`
			);
	}
};

const Harness = ({ opts }: { opts: MountOptions }) => (
	<div
		data-testid="tanstack-start-conformance-root"
		dir={opts.locale === 'ar' ? 'rtl' : undefined}
	>
		{componentFor(opts)}
	</div>
);

const ClientSettled = ({ onSettled }: { onSettled: () => void }) => {
	useEffect(() => {
		onSettled();
	}, [onSettled]);
	return null;
};

const renderTree = function renderTree(
	opts: MountOptions,
	config: KernelConfig,
	options: BoundaryOptions,
	bridge: SnapshotBridge,
	onSettled?: () => void
) {
	return (
		<ConsentBoundary
			config={config}
			persistence={opts.persistence ?? false}
			options={options}
		>
			{onSettled ? <ClientSettled onSettled={onSettled} /> : null}
			<StoreBridge bridge={bridge} />
			<Harness opts={opts} />
		</ConsentBoundary>
	);
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
	snapshot: ConsentSnapshot
): StoreState {
	const consents = { ...snapshot.consents } as Record<string, boolean>;
	return {
		...(snapshot as unknown as Record<string, unknown>),
		activeUI: activeUIForStore(snapshot.activeUI),
		consentCategories: [...snapshot.policyCategories],
		consents,
		selectedConsents: { ...consents },
	};
};

let lastBridge: SnapshotBridge | null = null;

const driver: TestDriver = {
	framework: 'tanstack-start',
	getStore() {
		const bridge = lastBridge;
		if (!bridge) {
			throw new Error('TanStack Start driver: getStore called before mount');
		}
		return {
			getState: () => {
				const snapshot = bridge.getSnapshot();
				if (!snapshot) {
					throw new Error('TanStack Start driver: no snapshot available');
				}
				return projectStoreState(snapshot);
			},
			subscribe: bridge.subscribe,
		};
	},
	async mount(opts: MountOptions): Promise<MountResult> {
		const lifecycle = lifecycleTransportFor(opts);
		const { config, options: baseOptions } = buildBoundaryProps(opts);
		const options: BoundaryOptions = lifecycle.transport
			? { ...baseOptions, mode: custom(lifecycle.transport) }
			: baseOptions;
		const bridge = createBridge();
		let resolveSettled: () => void = () => {};
		const settled = createVoidDeferredPromise((resolve) => {
			resolveSettled = resolve;
		});

		const container = document.createElement('div');
		document.body.appendChild(container);

		const root: Root = createRoot(container);
		root.render(renderTree(opts, config, options, bridge, resolveSettled));
		await settled;
		await flushScheduler();
		await waitForLazyComponent(opts.component);

		if (!bridge.getSnapshot()) {
			throw new Error(
				'TanStack Start driver: mount completed without a kernel snapshot'
			);
		}
		lastBridge = bridge;

		return {
			resolveInit: lifecycle.resolve
				? async () => {
						lifecycle.resolve?.();
						await flushScheduler();
					}
				: undefined,
			root: container,
			unmount: async () => {
				root.unmount();
				await flushScheduler();
				container.replaceChildren();
				container.remove();
				if (lastBridge === bridge) {
					lastBridge = null;
				}
			},
		};
	},
	serverRender(opts: MountOptions): Promise<string> {
		const { config, options } = buildBoundaryProps(opts);
		// Throwaway bridge: server render does not expose a live store.
		return Promise.resolve(
			renderToString(renderTree(opts, config, options, createBridge()))
		);
	},
};

const api: SuiteApi = {
	describe,
	expect: expect as unknown as SuiteApi['expect'],
	test,
};

runConformanceSuite(driver, api);
