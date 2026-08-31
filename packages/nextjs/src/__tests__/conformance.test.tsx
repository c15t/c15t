/**
 * Next.js conformance entry point.
 *
 * This driver targets the exported @c15t/nextjs surface: the nextjs-specific
 * `ConsentBoundary` (which forwards a server-produced `KernelConfig` to the
 * React v3 provider) plus the UI components and hooks the package re-exports
 * from `@c15t/react/v3`. Running the shared suite here validates both the
 * re-export and the nextjs-specific wrapping.
 *
 * Deliberate differences from the React v3 driver:
 * - The provider layer is `ConsentBoundary`, not `ConsentProvider`, so the
 *   nextjs `config` -> `options.prefetch` plumbing is on the tested path.
 * - `KernelContext` is not part of the public surface, so the store is
 *   observed through the public `useSnapshot` hook via a bridge component
 *   instead of reading the kernel directly.
 * - We import from `~/v3/boundary` and `@c15t/react/v3` (the exact module
 *   `@c15t/nextjs/v3` re-exports with `export *`) rather than `~/v3/index`,
 *   because the barrel also pulls in `next/headers`/`next/cache` which need
 *   a real Next.js server context. Existing nextjs tests follow the same
 *   convention.
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
import type { AllConsentNames } from '@c15t/core';
import type {
	KernelActiveUI,
	KernelConfig,
	ResolvedPolicy,
	TranslationsResponse,
} from '@c15t/core/v3';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentWidget,
	useSnapshot,
} from '@c15t/react/v3';
import type { ConsentSnapshot } from '@c15t/react/v3';
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { ConsentBoundary } from '~/v3/boundary';
import type { ConsentBoundaryProps } from '~/v3/boundary';

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

function createVoidDeferredPromise(
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
}

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
		rejectAll: 'Reject all',
		customize: 'Customize',
		save: 'Save',
	},
	cookieBanner: {
		title: 'We value your privacy',
		description: 'We use cookies to enhance your experience.',
	},
	consentManagerDialog: {
		title: 'Privacy preferences',
		description: 'Manage your choices.',
	},
	consentTypes: {
		necessary: {
			title: 'Necessary',
			description: 'Required for the site to function.',
		},
		functionality: {
			title: 'Functionality',
			description: 'Feature cookies.',
		},
		experience: {
			title: 'Experience',
			description: 'Experience cookies.',
		},
		measurement: {
			title: 'Measurement',
			description: 'Analytics and performance measurement.',
		},
		marketing: {
			title: 'Marketing',
			description: 'Targeted advertising.',
		},
	},
	frame: {
		title: 'Privacy',
		actionButton: 'Manage',
	},
	legalLinks: {
		privacyPolicy: 'Privacy policy',
		termsOfService: 'Terms of service',
		cookiePolicy: 'Cookie policy',
	},
};

function mergeTranslations(
	base: TranslationsResponse,
	override: Partial<TranslationsResponse> | undefined
): TranslationsResponse {
	if (!override || typeof override !== 'object') return base;
	return {
		...base,
		...override,
		common: { ...base.common, ...override.common },
		cookieBanner: { ...base.cookieBanner, ...override.cookieBanner },
		consentManagerDialog: {
			...base.consentManagerDialog,
			...override.consentManagerDialog,
		},
		consentTypes: {
			...base.consentTypes,
			...override.consentTypes,
		},
		frame: { ...base.frame, ...override.frame },
		legalLinks: { ...base.legalLinks, ...override.legalLinks },
	};
}

function resolveTranslations(options: ProviderOptions, locale?: string) {
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
}

function consentCategoriesFor(options: ProviderOptions): AllConsentNames[] {
	return options.consentCategories?.length === 0
		? [...DEFAULT_CONSENT_CATEGORIES]
		: [...(options.consentCategories ?? DEFAULT_CONSENT_CATEGORIES)];
}

function activeUIForComponent(
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
			// @c15t/nextjs does not re-export the IAB components.
			throw new DriverNotImplementedError('nextjs', `mount(${component})`);
	}
}

function buildPolicy(
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
		id: 'nextjs_conformance_policy',
		model: opts.policy?.model ?? 'opt-in',
		consent,
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

/**
 * Split the suite-provided provider options into the two channels the
 * nextjs surface exposes: the serializable `config` prop (what a Server
 * Component would produce) and the remaining client provider options.
 */
function buildBoundaryProps(opts: MountOptions): {
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
	// GPC arrives in the serializable server config — exactly the field
	// the nextjs server plumbing derives from the `sec-gpc` header.
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
					initialLocation: {
						countryCode: 'DE',
						regionCode: null,
					},
					initialBranding: 'c15t',
					initialPolicy: buildPolicy(opts, provided),
					initialPolicyDecision: {
						policyId: 'nextjs_conformance_policy',
						fingerprint: 'nextjs_conformance_fingerprint',
						matchedBy: 'default',
						country: 'DE',
						region: null,
						jurisdiction: 'GDPR',
					},
					initialPolicySnapshotToken: 'nextjs_conformance_token',
				}
			: basePrefetch;

	const { prefetch: _prefetch, ...rest } = provided;
	return {
		config,
		options: {
			...rest,
			disableAnimation: true,
			trapFocus: false,
			consentCategories: consentCategoriesFor(provided),
		},
	};
}

function createPendingInit() {
	let resolve!: () => void;
	const promise = createDeferredPromise<Record<string, never>>((settle) => {
		resolve = () => settle({});
	});
	return { promise, resolve };
}

function lifecycleTransportFor(opts: MountOptions) {
	if ((opts.initMode ?? 'authoritative') === 'pending') {
		const deferred = createPendingInit();
		return {
			transport: {
				init: () => deferred.promise,
			},
			resolve: deferred.resolve,
		};
	}
	if (opts.initMode === 'failing') {
		return {
			transport: {
				async init() {
					throw new Error('conformance: init failed');
				},
			},
			resolve: undefined,
		};
	}
	return { transport: undefined, resolve: undefined };
}

async function flushScheduler() {
	await createDeferredPromise((resolve) => setTimeout(resolve, 0));
	await createDeferredPromise((resolve) => setTimeout(resolve, 0));
}

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

async function waitForLazyComponent(
	component: MountableComponent
): Promise<void> {
	const selector = LAZY_COMPONENT_ROOTS[component];
	if (!selector) return;
	const deadline = Date.now() + 5000;
	while (Date.now() < deadline) {
		if (document.querySelector(selector)) return;
		await createDeferredPromise((resolve) => setTimeout(resolve, 10));
	}
}

/**
 * The nextjs surface does not expose the kernel (no `KernelContext`
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

function createBridge(): SnapshotBridge {
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
}

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

function componentFor(opts: MountOptions): ReactElement {
	const providerOptions = opts.providerOptions;
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
			throw new DriverNotImplementedError('nextjs', `mount(${opts.component})`);
	}
}

const Harness = ({ opts }: { opts: MountOptions }) => {
	return (
		<div
			data-testid="nextjs-conformance-root"
			dir={opts.locale === 'ar' ? 'rtl' : undefined}
		>
			{componentFor(opts)}
		</div>
	);
};

const ClientSettled = ({ onSettled }: { onSettled: () => void }) => {
	useEffect(() => {
		onSettled();
	}, [onSettled]);
	return null;
};

function renderTree(
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
}

function activeUIForStore(activeUI: KernelActiveUI): StoreState['activeUI'] {
	if (activeUI === 'banner' || activeUI === 'dialog') return activeUI;
	return 'none';
}

function projectStoreState(snapshot: ConsentSnapshot): StoreState {
	const consents = { ...snapshot.consents } as Record<string, boolean>;
	return {
		...(snapshot as unknown as Record<string, unknown>),
		consents,
		selectedConsents: { ...consents },
		activeUI: activeUIForStore(snapshot.activeUI),
		consentCategories: [...snapshot.policyCategories],
	};
}

let lastBridge: SnapshotBridge | null = null;

const driver: TestDriver = {
	framework: 'nextjs',
	async mount(opts: MountOptions): Promise<MountResult> {
		const lifecycle = lifecycleTransportFor(opts);
		const { config, options: baseOptions } = buildBoundaryProps(opts);
		const options: BoundaryOptions = lifecycle.transport
			? { ...baseOptions, transport: lifecycle.transport }
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
				'Next.js driver: mount completed without a kernel snapshot'
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
				if (lastBridge === bridge) lastBridge = null;
			},
		};
	},
	getStore() {
		const bridge = lastBridge;
		if (!bridge) {
			throw new Error('Next.js driver: getStore called before mount');
		}
		return {
			getState: () => {
				const snapshot = bridge.getSnapshot();
				if (!snapshot) {
					throw new Error('Next.js driver: no snapshot available');
				}
				return projectStoreState(snapshot);
			},
			subscribe: bridge.subscribe,
		};
	},
	async serverRender(opts: MountOptions): Promise<string> {
		const { config, options } = buildBoundaryProps(opts);
		// Throwaway bridge: server render does not expose a live store.
		return renderToString(renderTree(opts, config, options, createBridge()));
	},
};

const api: SuiteApi = {
	describe,
	test,
	expect: expect as unknown as SuiteApi['expect'],
};

runConformanceSuite(driver, api);
