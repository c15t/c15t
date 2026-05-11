<script lang="ts">
import { createIAB, type IABHandle } from '@c15t/iab/v3';
import { generateThemeCSS } from '@c15t/ui/theme';
import { deepMerge, setupColorScheme } from '@c15t/ui/utils';
import {
	type AllConsentNames,
	type Callbacks,
	defaultTranslationConfig,
	type I18nConfig,
	type User,
} from 'c15t';
import {
	type ConsentKernel,
	type ConsentSnapshot,
	type ConsentState,
	createConsentKernel,
	createHostedTransport,
	createOfflineTransport,
	type KernelConfig,
	type KernelEvent,
	type KernelOverrides,
	type KernelTranslations,
	type KernelTransport,
	type KernelUser,
	type TranslationsResponse,
} from 'c15t/v3';
import { createIframeBlocker } from 'c15t/v3/modules/iframe-blocker';
import { createNetworkBlocker } from 'c15t/v3/modules/network-blocker';
import { createPersistence } from 'c15t/v3/modules/persistence';
import { createScriptLoader } from 'c15t/v3/modules/script-loader';
import type { Snippet } from 'svelte';
import { onDestroy, onMount, untrack } from 'svelte';
import {
	type ConsentDraftState,
	type SvelteIABState,
	setConsentContext,
	setThemeContext,
} from '../context.svelte';
import type {
	ConsentProviderOptions,
	ProviderIABOptions,
	ProviderMode,
	UsePersistenceOptions,
} from '../types';
import { defaultTheme } from '../utils';

const ALL_CONSENTS_ON: ConsentState = {
	necessary: true,
	functionality: true,
	marketing: true,
	measurement: true,
	experience: true,
};

const DEFAULT_TRANSLATIONS: KernelTranslations = {
	language: 'en',
	translations: defaultTranslationConfig.translations.en as never,
};

type ConsentProviderProps = ConsentProviderOptions & {
	children?: Snippet;
	options?: ConsentProviderOptions;
};

let props: ConsentProviderProps = $props();
const children = $derived(props.children);
const options = $derived(resolveProviderOptions(props));

function mergeDefinedOptions(
	base: ConsentProviderOptions,
	overrides: ConsentProviderOptions
): ConsentProviderOptions {
	const merged = { ...base };
	for (const [key, value] of Object.entries(overrides) as Array<
		[keyof ConsentProviderOptions, ConsentProviderOptions[keyof ConsentProviderOptions]]
	>) {
		if (value !== undefined) {
			merged[key] = value as never;
		}
	}
	return merged;
}

function resolveProviderOptions({
	children: _children,
	options: nestedOptions = {},
	...topLevelOptions
}: ConsentProviderProps): ConsentProviderOptions {
	return mergeDefinedOptions(nestedOptions, topLevelOptions);
}

function normalizeUser(
	user: ConsentProviderOptions['user']
): KernelUser | undefined {
	if (!user) return undefined;
	if ('externalId' in user) return user;
	const legacy = user as User;
	return {
		externalId: legacy.id,
		identityProvider: legacy.identityProvider,
	};
}

function resolveI18nTranslations(
	i18n: Partial<I18nConfig> | undefined
): KernelTranslations | undefined {
	if (!i18n?.messages) return undefined;
	const language =
		i18n.locale ?? defaultTranslationConfig.defaultLanguage ?? 'en';
	const fallbackTranslations = defaultTranslationConfig.translations
		.en as TranslationsResponse;
	const selected =
		i18n.messages[language] ??
		i18n.messages.en ??
		fallbackTranslations;
	const base =
		defaultTranslationConfig.translations[
			language as keyof typeof defaultTranslationConfig.translations
		] ?? fallbackTranslations;
	return {
		language,
		translations: deepMerge(base, selected) as TranslationsResponse,
	};
}

function getEnabled(providerOptions: ConsentProviderOptions): boolean {
	return providerOptions.enabled ?? true;
}

function getStorageConfig(providerOptions: ConsentProviderOptions) {
	return providerOptions.storageConfig;
}

function getProviderCallbacks(
	providerOptions: ConsentProviderOptions
): Callbacks | undefined {
	return providerOptions.callbacks;
}

function getProviderPolicies(providerOptions: ConsentProviderOptions) {
	return providerOptions.policies;
}

function getProviderIab(
	providerOptions: ConsentProviderOptions
): ProviderIABOptions | undefined {
	return providerOptions.iab;
}

function buildInlinePolicy(
	categories: AllConsentNames[] | undefined
): KernelConfig['initialPolicy'] {
	return {
		id: 'inline-consent-categories',
		model: 'opt-in',
		consent: {
			categories:
				categories && categories.length > 0
					? categories
					: [
							'necessary',
							'functionality',
							'marketing',
							'measurement',
							'experience',
						],
			scopeMode: 'permissive',
		},
		ui: {
			mode: 'banner',
		},
	};
}

function buildNoBannerPolicy(): KernelConfig['initialPolicy'] {
	return {
		id: 'no_banner',
		model: 'none',
		ui: {
			mode: 'none',
		},
	};
}

function createStaticOfflineTransport(
	prefetch: KernelConfig,
	translations: KernelTranslations,
	categories: AllConsentNames[] | undefined,
	useInlineFallback: boolean
): KernelTransport | null {
	const policy =
		prefetch.initialPolicy ??
		(useInlineFallback ? buildInlinePolicy(categories) : undefined);
	if (!policy) return null;
	return {
		async init(ctx) {
			return {
				location: {
					countryCode: ctx.overrides.country ?? null,
					regionCode: ctx.overrides.region ?? null,
				},
				translations:
					prefetch.initialTranslations ??
					(ctx.overrides.language
						? { ...translations, language: ctx.overrides.language }
						: translations),
				branding: prefetch.initialBranding ?? 'c15t',
				policy,
				policyDecision: prefetch.initialPolicyDecision,
				policySnapshotToken: prefetch.initialPolicySnapshotToken,
			};
		},
		async save(payload) {
			return { ok: true, subjectId: payload.subjectId };
		},
	};
}

function createProviderKernel(
	providerOptions: ConsentProviderOptions
): ConsentKernel {
	const enabled = getEnabled(providerOptions);
	const mode: ProviderMode =
		providerOptions.mode ?? (providerOptions.backendURL ? 'hosted' : 'offline');
	const prefetch = providerOptions.prefetch ?? {};
	const policyPacks = getProviderPolicies(providerOptions);
	const i18nTranslations =
		resolveI18nTranslations(providerOptions.i18n) ?? DEFAULT_TRANSLATIONS;

	const baseTransport =
		providerOptions.transport ??
		(mode === 'hosted' || mode === 'c15t'
			? createHostedTransport({
					backendURL: providerOptions.backendURL ?? '/api/c15t',
					domain: providerOptions.domain,
					headers: providerOptions.headers,
					fetch: providerOptions.customFetch,
				})
			: (createStaticOfflineTransport(
					prefetch,
					i18nTranslations,
					providerOptions.consentCategories,
					policyPacks === undefined
				) ??
				createOfflineTransport({
					policyPacks,
					translations: i18nTranslations,
				})));

	return createConsentKernel({
		...prefetch,
		transport: baseTransport,
		initialConsents: enabled
			? (prefetch.initialConsents ?? undefined)
			: ALL_CONSENTS_ON,
		initialOverrides: {
			...(prefetch.initialOverrides ?? {}),
			...(providerOptions.overrides ?? {}),
		},
		initialUser: normalizeUser(providerOptions.user) ?? prefetch.initialUser,
		initialTranslations: prefetch.initialTranslations ?? i18nTranslations,
		initialPolicy:
			enabled === false
				? (prefetch.initialPolicy ?? buildNoBannerPolicy())
				: (prefetch.initialPolicy ??
						(policyPacks === undefined
							? buildInlinePolicy(providerOptions.consentCategories)
							: undefined)),
		initialPolicyDecision: prefetch.initialPolicyDecision,
		initialPolicySnapshotToken: prefetch.initialPolicySnapshotToken,
	});
}

const kernel = untrack(() => createProviderKernel(options));

let earlyPersistence:
	| ReturnType<typeof createPersistence>
	| null = null;
const initialEnabled = untrack(() => getEnabled(options));
const initialPersistenceOptions = untrack(() => normalizePersistenceOptions());

if (
	typeof document !== 'undefined' &&
	typeof localStorage !== 'undefined' &&
	initialEnabled
) {
	const persistenceOptions = initialPersistenceOptions;
	if (persistenceOptions && persistenceOptions.skipHydration !== true) {
		earlyPersistence = createPersistence({
			kernel,
			storageConfig: persistenceOptions.storageConfig,
		});
		if (kernel.getSnapshot().hasConsented) {
			kernel.set.activeUI('none');
		}
	}
}

let snapshot = $state<ConsentSnapshot>(kernel.getSnapshot());
let draftValues = $state<Partial<ConsentState>>({});
let iabHandle = $state<IABHandle | null>(null);
let iabTab = $state<'purposes' | 'vendors'>('purposes');
let configuredCategories = $state<AllConsentNames[]>(
	untrack(() => options.consentCategories ?? [])
);

const draft: ConsentDraftState = {
	get values() {
		return draftValues;
	},
	set(name, value) {
		draftValues = { ...draftValues, [name]: value };
	},
	reset() {
		draftValues = {};
	},
	async save() {
		await kernel.commands.save(draftValues);
		draftValues = {};
	},
};

function getIABState(): SvelteIABState | null {
	const iab = snapshot.iab;
	if (!iab) return null;
	const noop = () => {};
	const noopAsync = async () => {};
	return {
		...iab,
		config: {
			enabled: iab.enabled,
			cmpId: iab.cmpId,
		},
		isLoadingGVL: iab.enabled && !iab.gvl,
		nonIABVendors: iab.customVendors,
		preferenceCenterTab: iabTab,
		setPreferenceCenterTab(tab) {
			iabTab = tab;
		},
		setVendorConsent: iabHandle?.setVendorConsent ?? noop,
		setVendorLegitimateInterest:
			iabHandle?.setVendorLegitimateInterest ?? noop,
		setPurposeConsent: iabHandle?.setPurposeConsent ?? noop,
		setPurposeLegitimateInterest:
			iabHandle?.setPurposeLegitimateInterest ?? noop,
		setSpecialFeatureOptIn: iabHandle?.setSpecialFeatureOptIn ?? noop,
		acceptAll: iabHandle?.acceptAll ?? noop,
		rejectAll: iabHandle?.rejectAll ?? noop,
		save: iabHandle?.save ?? noopAsync,
	};
}

setConsentContext(kernel, {
	getSnapshot: () => snapshot,
	getDraft: () => draft,
	getIAB: getIABState,
	getConsentCategories: () => configuredCategories,
	getLegalLinks: () => options.legalLinks,
});

const unsubscribe = kernel.subscribe((next) => {
	snapshot = next;
});

function stringifyError(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}

function categoriesWithValue(next: ConsentSnapshot, value: boolean) {
	return Object.entries(next.consents)
		.filter(([, enabled]) => enabled === value)
		.map(([category]) => category as AllConsentNames);
}

function snapshotConsentsChanged(
	previous: ConsentSnapshot,
	next: ConsentSnapshot
): boolean {
	return Object.keys(next.consents).some(
		(key) =>
			next.consents[key as AllConsentNames] !==
			previous.consents[key as AllConsentNames]
	);
}

function hasRevokedConsent(previous: ConsentSnapshot, next: ConsentSnapshot) {
	if (!previous.hasConsented) return false;
	return Object.keys(previous.consents).some((key) => {
		const category = key as AllConsentNames;
		return (
			category !== 'necessary' &&
			previous.consents[category] &&
			!next.consents[category]
		);
	});
}

function wireCallbacks(callbacks: Callbacks | undefined) {
	let saveStartedSnapshot: ConsentSnapshot | null = null;
	const reloadOnConsentRevoked = options.reloadOnConsentRevoked !== false;
	const subscriptions = [
		kernel.events.on('init:applied', ({ snapshot: next }) => {
			const decision = next.policyDecision as { jurisdiction?: unknown } | null;
			callbacks?.onBannerFetched?.({
				jurisdiction:
					typeof decision?.jurisdiction === 'string'
						? (decision.jurisdiction as never)
						: ('NONE' as never),
				location: {
					countryCode: next.location?.countryCode ?? null,
					regionCode: next.location?.regionCode ?? null,
				},
				translations: next.translations ?? { ...DEFAULT_TRANSLATIONS },
			});
		}),
		kernel.events.on('command:save:started', () => {
			saveStartedSnapshot = kernel.getSnapshot();
		}),
		kernel.events.on('command:save:completed', ({ result }) => {
			if (!result.ok) return;
			const previous = saveStartedSnapshot;
			const next = kernel.getSnapshot();
			callbacks?.onConsentSet?.({
				preferences: next.consents as never,
			});
			if (previous && snapshotConsentsChanged(previous, next)) {
				callbacks?.onConsentChanged?.({
					preferences: next.consents as never,
					previousPreferences: previous.consents as never,
					allowedCategories: categoriesWithValue(next, true),
					deniedCategories: categoriesWithValue(next, false),
					previousAllowedCategories: categoriesWithValue(previous, true),
					previousDeniedCategories: categoriesWithValue(previous, false),
				});
				if (reloadOnConsentRevoked && hasRevokedConsent(previous, next)) {
					callbacks?.onBeforeConsentRevocationReload?.({
						preferences: next.consents as never,
					});
					if (typeof window !== 'undefined') {
						window.location.reload();
					}
				}
			}
		}),
		kernel.events.on(
			'command:error',
			(event: Extract<KernelEvent, { type: 'command:error' }>) => {
				callbacks?.onError?.({
					error: stringifyError(event.error),
				});
			}
		),
	];
	return () => {
		for (const dispose of subscriptions) dispose();
	};
}

const disposeCallbacks = untrack(() =>
	wireCallbacks(getProviderCallbacks(options))
);
let hasSkippedInitialOverridesInit = false;

function normalizePersistenceOptions():
	| UsePersistenceOptions
	| false
	| undefined {
	if (options.persistence === false) return false;
	const storageConfig = getStorageConfig(options);
	if (options.persistence === true || options.persistence === undefined) {
		return { storageConfig };
	}
	return {
		storageConfig: options.persistence.storageConfig ?? storageConfig,
		skipHydration: options.persistence.skipHydration,
	};
}

function normalizeIabOptions(iab: ProviderIABOptions | undefined) {
	if (iab === false || !iab || iab.enabled === false) return null;
	const cmpId = iab.cmpId;
	if (typeof cmpId !== 'number') return null;
	return {
		...iab,
		cmpId,
		cmpVersion:
			typeof iab.cmpVersion === 'string'
				? Number(iab.cmpVersion)
				: iab.cmpVersion,
		gvl: iab.gvl ?? snapshot.iab?.gvl ?? undefined,
	};
}

onMount(() => {
	const disposers: Array<() => void> = [];
	const enabled = getEnabled(options);
	const persistenceOptions = normalizePersistenceOptions();

	if (enabled && persistenceOptions) {
		const persistence =
			earlyPersistence ??
			createPersistence({
				kernel,
				storageConfig: persistenceOptions.storageConfig,
				skipHydration: true,
			});
		if (!earlyPersistence && persistenceOptions.skipHydration !== true) {
			persistence.hydrate();
			if (kernel.getSnapshot().hasConsented) {
				kernel.set.activeUI('none');
			}
			snapshot = kernel.getSnapshot();
		}
		disposers.push(() => {
			persistence.dispose();
			if (earlyPersistence === persistence) {
				earlyPersistence = null;
			}
		});
	}

	if (enabled) {
		void kernel.commands.init().then(() => {
			if (kernel.getSnapshot().hasConsented) {
				kernel.set.activeUI('none');
			}
		});
	}

	if (enabled && options.scripts && options.scripts.length > 0) {
		const loader = createScriptLoader({
			kernel,
			scripts: options.scripts,
			onDebug: options.scriptLoader?.onDebug,
		});
		disposers.push(() => loader.dispose());
	}

	if (enabled && options.networkBlocker) {
		const blocker = createNetworkBlocker({
			kernel,
			rules: options.networkBlocker.rules,
			enabled: options.networkBlocker.enabled,
			logBlockedRequests: options.networkBlocker.logBlockedRequests,
			onRequestBlocked: options.networkBlocker.onRequestBlocked,
		});
		disposers.push(() => blocker.dispose());
	}

	if (enabled && options.iframeBlocker !== false) {
		const blocker = createIframeBlocker({
			kernel,
			...(options.iframeBlocker ?? {}),
		});
		disposers.push(() => blocker.dispose());
	}

	const iabOptions = normalizeIabOptions(getProviderIab(options));
	if (enabled && iabOptions) {
		const handle = createIAB({ ...iabOptions, kernel });
		iabHandle = handle;
		disposers.push(() => {
			handle.dispose();
			iabHandle = null;
		});
	}

	return () => {
		for (const dispose of disposers.reverse()) dispose();
	};
});

$effect(() => {
	configuredCategories = options.consentCategories ?? [];
});

$effect(() => {
	const nextUser = normalizeUser(options.user);
	if (nextUser) {
		void kernel.commands.identify(nextUser);
	}
});

$effect(() => {
	const overrides: KernelOverrides = options.overrides ?? {};
	kernel.set.overrides(overrides);
	if (!hasSkippedInitialOverridesInit) {
		hasSkippedInitialOverridesInit = true;
		return;
	}
	if (getEnabled(options)) {
		void kernel.commands.init().then(() => {
			if (kernel.getSnapshot().hasConsented) {
				kernel.set.activeUI('none');
			}
		});
	}
});

$effect(() => {
	if (getEnabled(options)) return;
	kernel.set.consent(ALL_CONSENTS_ON);
	kernel.set.activeUI('none');
	kernel.set.hasConsented(true);
});

let prefersReducedMotion = $state(false);

onMount(() => {
	if (typeof window === 'undefined' || !window.matchMedia) return;
	const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	prefersReducedMotion = mediaQuery.matches;

	const handler = (event: MediaQueryListEvent) => {
		prefersReducedMotion = event.matches;
	};
	mediaQuery.addEventListener('change', handler);
	return () => mediaQuery.removeEventListener('change', handler);
});

const mergedTheme = $derived(deepMerge(defaultTheme, options.theme ?? {}));

setThemeContext({
	get theme() {
		return mergedTheme;
	},
	get noStyle() {
		return options.noStyle;
	},
	get disableAnimation() {
		return options.disableAnimation ?? prefersReducedMotion;
	},
	get trapFocus() {
		return options.trapFocus ?? true;
	},
	get scrollLock() {
		return options.scrollLock;
	},
	get colorScheme() {
		return options.colorScheme;
	},
	get legalLinks() {
		return options.legalLinks;
	},
});

const themeCSS = $derived(generateThemeCSS(mergedTheme));

let themeStyleEl: HTMLStyleElement | null = null;
let ownedStyleEl = false;

$effect(() => {
	if (!themeCSS || typeof document === 'undefined') return;
	if (!themeStyleEl) {
		themeStyleEl = document.getElementById(
			'c15t-theme'
		) as HTMLStyleElement | null;
		if (!themeStyleEl) {
			themeStyleEl = document.createElement('style');
			themeStyleEl.id = 'c15t-theme';
			document.head.appendChild(themeStyleEl);
			ownedStyleEl = true;
		}
	}
	themeStyleEl.textContent = themeCSS;
});

$effect(() => {
	if (options.colorScheme == null) return;
	return setupColorScheme(options.colorScheme);
});

onDestroy(() => {
	unsubscribe();
	disposeCallbacks();
	if (ownedStyleEl && themeStyleEl) {
		themeStyleEl.remove();
		themeStyleEl = null;
		ownedStyleEl = false;
	}
});
</script>

{#if children}
	{@render children()}
{/if}
