import {
	IAB_FIXTURE_CMP_ID,
	IAB_FIXTURE_CMP_VERSION,
	MINIMAL_GVL,
	runConformanceSuite,
} from '@c15t/conformance';
/**
 * Next.js conformance entry point.
 *
 * This driver targets the kernel adapter: `ConsentProvider` plus the
 * useSyncExternalStore-backed selector hooks.
 */
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
	TranslationsResponse,
} from '@c15t/core';
import {
	ConsentDialog,
	ConsentWidget,
	ConsentBanner,
	custom,
	offline,
} from '@c15t/react';
import type { ConsentProviderOptions } from '@c15t/react';
import { KernelContext } from '@c15t/react/context';
import {
	IABProvider,
	IABConsentBanner,
	IABConsentDialog,
} from '@c15t/react/iab';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import type { GlobalVendorList } from '@c15t/schema/types';
import { useContext, useEffect } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';

import { ConsentBoundary } from '../boundary';
import { createPolicySession, probePolicyContract } from './policy-driver';
import { policyFixture } from './policy-fixture';

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

type ProviderOptions = ConsentProviderOptions & {
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

const isIabComponent = function isIabComponent(
	component: MountableComponent
): boolean {
	return (
		component === 'iab-consent-banner' || component === 'iab-consent-dialog'
	);
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
			throw new Error(`Unsupported component: ${component}`);
	}
};

const buildProviderOptions = (opts: MountOptions): ConsentProviderOptions => {
	const provided = (opts.providerOptions ?? {}) as ProviderOptions;
	const state = opts.initialState as
		| { consents?: Record<string, boolean> }
		| undefined;
	const prepared = policyFixture(state?.consents, {
		categories: consentCategoriesFor(provided).filter(
			(category) => category !== 'necessary'
		),
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
		scopeMode: 'strict',
	});
	return {
		...provided,
		disableAnimation: true,
		mode: offline(),
		persistence: opts.persistence ?? false,
		prefetch: {
			...prepared,
			...provided.prefetch,
			initialPolicyPending:
				opts.initMode === 'pending' || opts.initMode === 'failing',
			initialPolicyResolution:
				(opts.initMode ?? 'authoritative') === 'authoritative'
					? prepared.initialPolicyResolution
					: undefined,
			initialPrivacySignals: { gpc: opts.gpc },
			initialTranslations: resolveTranslations(provided, opts.locale),
		},
		trapFocus: provided.trapFocus ?? false,
	};
};

const createPendingInit = function createPendingInit() {
	let resolve!: () => void;
	const promise = createDeferredPromise<{ policyResolution: unknown }>(
		(settle) => {
			resolve = () =>
				settle({
					policyResolution: writePolicyResolutionWire(
						policyFixture().initialPolicyResolution ?? {
							policy: null,
							status: 'unconfigured',
						}
					),
				});
		}
	);
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
				init: () => Promise.reject(new Error('conformance: init failed')),
			},
		};
	}
	return { resolve: undefined, transport: undefined };
};

const flushScheduler = async function flushScheduler() {
	await createDeferredPromise((resolve) => setTimeout(resolve, 0));
	await createDeferredPromise((resolve) => setTimeout(resolve, 0));
};

const KernelCapture = ({
	onKernel,
}: {
	onKernel: (kernel: ConsentKernel) => void;
}) => {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error('Next.js driver: missing kernel context');
	}
	useEffect(() => onKernel(kernel), [kernel, onKernel]);
	return null;
};

const componentFor = function componentFor(opts: MountOptions): ReactElement {
	const provided = (opts.providerOptions ?? {}) as ProviderOptions;
	const trapFocus = provided.trapFocus ?? false;

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
			return <IABConsentBanner />;
		case 'iab-consent-dialog':
			return <IABConsentDialog />;
		default:
			throw new Error(`Unsupported component: ${opts.component}`);
	}
};

const Harness = ({
	opts,
	onKernel,
}: {
	opts: MountOptions;
	onKernel: (kernel: ConsentKernel) => void;
}) => (
	<div
		data-testid="react-v3-conformance-root"
		dir={opts.locale === 'ar' ? 'rtl' : undefined}
	>
		<KernelCapture onKernel={onKernel} />
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
	options: ConsentProviderOptions,
	onKernel: (kernel: ConsentKernel) => void,
	onSettled?: () => void
) {
	const content = (
		<Harness
			opts={opts}
			onKernel={onKernel}
		/>
	);
	return (
		<ConsentBoundary
			config={options.prefetch ?? {}}
			options={options}
			persistence={options.persistence}
		>
			{onSettled ? <ClientSettled onSettled={onSettled} /> : null}
			{isIabComponent(opts.component) ? (
				<IABProvider
					cmpId={IAB_FIXTURE_CMP_ID}
					cmpVersion={IAB_FIXTURE_CMP_VERSION}
					gvl={MINIMAL_GVL as unknown as GlobalVendorList}
				>
					{content}
				</IABProvider>
			) : (
				content
			)}
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
		consentCategories: ['necessary', ...snapshot.policyRule.scope],
		consents,
		selectedConsents: { ...consents },
	};
};

let lastKernel: ConsentKernel | null = null;

const driver: TestDriver = {
	createPolicySession,
	framework: 'nextjs',
	getStore() {
		if (!lastKernel) {
			throw new Error('Next.js driver: getStore called before mount');
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
		const lifecycle = lifecycleTransportFor(opts);
		const options = buildProviderOptions(opts);
		if (lifecycle.transport) {
			options.mode = custom(lifecycle.transport);
		}
		let mountedKernel: ConsentKernel | null = null;
		let resolveSettled: () => void = () => {};
		const settled = createVoidDeferredPromise((resolve) => {
			resolveSettled = resolve;
		});

		const container = document.createElement('div');
		document.body.appendChild(container);

		const root: Root = createRoot(container);
		root.render(
			renderTree(
				opts,
				options,
				(kernel) => {
					mountedKernel = kernel;
					lastKernel = kernel;
					if (activeUIForComponent(opts.component) === 'dialog') {
						kernel.set.activeUI('dialog');
					}
				},
				resolveSettled
			)
		);
		await settled;
		await flushScheduler();
		if (opts.component === 'consent-widget') {
			await vi.waitFor(() =>
				expect(
					container.querySelector('[data-testid="consent-widget-root"]')
				).not.toBeNull()
			);
		}

		if (!mountedKernel) {
			throw new Error('Next.js driver: mount completed without kernel');
		}

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
				if (lastKernel === mountedKernel) {
					lastKernel = null;
				}
			},
		};
	},
	probePolicyContract,
	serverRender(opts: MountOptions): Promise<string> {
		const options = buildProviderOptions(opts);
		return Promise.resolve(
			renderToString(
				renderTree(opts, options, () => {
					// Server render does not expose a live store to the conformance suite.
				})
			)
		);
	},
};

const api: SuiteApi = {
	describe,
	expect: expect as unknown as SuiteApi['expect'],
	test,
};

runConformanceSuite(driver, api);
