/**
 * React v3 conformance entry point.
 *
 * This driver targets the v3 kernel adapter: `ConsentProvider` plus the
 * useSyncExternalStore-backed selector hooks. The package still contains a
 * v2-surface conformance driver in `conformance.test.tsx`; keep both so the
 * shared suite compares the legacy provider and the v3 adapter behavior.
 */

import {
	IAB_FIXTURE_CMP_ID,
	IAB_FIXTURE_CMP_VERSION,
	MINIMAL_GVL,
	type MountableComponent,
	type MountOptions,
	type MountResult,
	runConformanceSuite,
	type SuiteApi,
	type TestDriver,
} from '@c15t/conformance';
import type { GlobalVendorList } from '@c15t/schema/types';
import type { AllConsentNames } from 'c15t';
import type {
	ConsentKernel,
	KernelActiveUI,
	KernelConfig,
	ResolvedPolicy,
	TranslationsResponse,
} from 'c15t/v3';
import { type ReactElement, useContext, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { ConsentDialog } from '~/v3/components/consent-dialog';
import { ConsentWidget } from '~/v3/components/consent-widget';
import { KernelContext } from '~/v3/context';
import { IABConsentBanner, IABConsentDialog } from '~/v3/iab';
import {
	ConsentBanner,
	ConsentProvider,
	type ConsentProviderOptions,
} from '~/v3/index';

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

function isIabComponent(component: MountableComponent): boolean {
	return (
		component === 'iab-consent-banner' || component === 'iab-consent-dialog'
	);
}

function activeUIForComponent(component: MountableComponent): KernelActiveUI {
	switch (component) {
		case 'consent-dialog':
		case 'consent-widget':
		case 'iab-consent-dialog':
			return 'dialog';
		case 'consent-banner':
		case 'iab-consent-banner':
			return 'banner';
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
	return {
		id: 'react_v3_conformance_policy',
		model: opts.policy?.model ?? 'opt-in',
		consent: {
			categories: consentCategoriesFor(options),
			scopeMode: 'permissive',
			...(opts.policy?.respectGpc === undefined
				? {}
				: { gpc: opts.policy.respectGpc }),
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

/**
 * IAB mounts mirror the production wiring (and the v3 IAB unit tests):
 * offline mode with an `iab` model `offlinePolicy` plus the provider's
 * `iab` option, which routes through `createIAB` and seeds the kernel's
 * IAB slice with the shared minimal GVL fixture.
 */
function buildIabProviderOptions(opts: MountOptions): ConsentProviderOptions {
	const provided = (opts.providerOptions ?? {}) as ProviderOptions;
	return {
		...provided,
		mode: 'offline',
		persistence: opts.persistence ?? false,
		disableAnimation: true,
		trapFocus: false,
		iab: {
			enabled: true,
			cmpId: IAB_FIXTURE_CMP_ID,
			cmpVersion: IAB_FIXTURE_CMP_VERSION,
			gvl: MINIMAL_GVL as unknown as GlobalVendorList,
		},
		offlinePolicy: {
			policy: {
				id: 'react_v3_conformance_iab_policy',
				model: 'iab',
				ui: {
					mode: activeUIForComponent(opts.component),
				},
			},
		},
	};
}

function buildProviderOptions(opts: MountOptions): ConsentProviderOptions {
	if (isIabComponent(opts.component)) {
		return buildIabProviderOptions(opts);
	}
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
	const prefetch: KernelConfig =
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
						policyId: 'react_v3_conformance_policy',
						fingerprint: 'react_v3_conformance_fingerprint',
						matchedBy: 'default',
						country: 'DE',
						region: null,
						jurisdiction: 'GDPR',
					},
					initialPolicySnapshotToken: 'react_v3_conformance_token',
				}
			: basePrefetch;

	return {
		...provided,
		mode: 'offline',
		persistence: opts.persistence ?? false,
		disableAnimation: true,
		trapFocus: false,
		consentCategories: consentCategoriesFor(provided),
		// GPC uses the provider's public `overrides` input — the same channel
		// a real app (or the nextjs server plumbing) delivers the signal on.
		...(opts.gpc === undefined ? {} : { overrides: { gpc: opts.gpc } }),
		prefetch,
	};
}

function createPendingInit() {
	let resolve!: () => void;
	const promise = new Promise<Record<string, never>>((settle) => {
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
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

function KernelCapture({
	onKernel,
}: {
	onKernel: (kernel: ConsentKernel) => void;
}) {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error('React v3 driver: missing kernel context');
	}
	onKernel(kernel);
	return null;
}

function componentFor(opts: MountOptions): ReactElement {
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
	}
}

function Harness({
	opts,
	onKernel,
}: {
	opts: MountOptions;
	onKernel: (kernel: ConsentKernel) => void;
}) {
	return (
		<div
			data-testid="react-v3-conformance-root"
			dir={opts.locale === 'ar' ? 'rtl' : undefined}
		>
			<KernelCapture onKernel={onKernel} />
			{componentFor(opts)}
		</div>
	);
}

function ClientSettled({ onSettled }: { onSettled: () => void }) {
	useEffect(() => {
		onSettled();
	}, [onSettled]);
	return null;
}

function renderTree(
	opts: MountOptions,
	options: ConsentProviderOptions,
	onKernel: (kernel: ConsentKernel) => void,
	onSettled?: () => void
) {
	return (
		<ConsentProvider options={options}>
			{onSettled ? <ClientSettled onSettled={onSettled} /> : null}
			<Harness
				opts={opts}
				onKernel={onKernel}
			/>
		</ConsentProvider>
	);
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
	framework: 'react',
	async mount(opts: MountOptions): Promise<MountResult> {
		const lifecycle = lifecycleTransportFor(opts);
		const options = {
			...buildProviderOptions(opts),
			...(lifecycle.transport ? { transport: lifecycle.transport } : {}),
		};
		let mountedKernel: ConsentKernel | null = null;
		let resolveSettled: () => void = () => {};
		const settled = new Promise<void>((resolve) => {
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
				},
				resolveSettled
			)
		);
		await settled;
		await flushScheduler();

		if (!mountedKernel) {
			throw new Error('React v3 driver: mount completed without kernel');
		}

		return {
			root: container,
			resolveInit: lifecycle.resolve
				? async () => {
						lifecycle.resolve?.();
						await flushScheduler();
					}
				: undefined,
			unmount: async () => {
				root.unmount();
				await flushScheduler();
				container.replaceChildren();
				container.remove();
				if (lastKernel === mountedKernel) lastKernel = null;
			},
		};
	},
	getStore() {
		if (!lastKernel) {
			throw new Error('React v3 driver: getStore called before mount');
		}
		return {
			getState: () => projectStoreState(lastKernel as ConsentKernel),
			subscribe: (listener) =>
				(lastKernel as ConsentKernel).subscribe(() => {
					listener();
				}),
		};
	},
	async serverRender(opts: MountOptions): Promise<string> {
		const options = buildProviderOptions(opts);
		return renderToString(
			renderTree(opts, options, () => {
				// Server render does not expose a live store to the conformance suite.
			})
		);
	},
};

const api: SuiteApi = {
	describe,
	test,
	expect: expect as unknown as SuiteApi['expect'],
};

runConformanceSuite(driver, api);
