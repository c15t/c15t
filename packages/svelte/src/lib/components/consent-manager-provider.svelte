<script lang="ts">
	import { createConsentKernel, defaultTranslationConfig } from '@c15t/core';
	import type {
		AllConsentNames,
		Callbacks,
		ConsentKernel,
		ConsentSnapshot,
		ConsentState,
		I18nConfig,
		KernelConfig,
		KernelEvent,
		KernelOverrides,
		KernelTranslations,
		KernelUser,
		ProviderTransportContext,
		ProviderTransportFactory,
		TranslationsResponse,
		User,
	} from '@c15t/core';
	import { createIframeBlocker } from '@c15t/core/modules/iframe-blocker';
	import { createNetworkBlocker } from '@c15t/core/modules/network-blocker';
	import { createPersistence } from '@c15t/core/modules/persistence';
	import { createScriptLoader } from '@c15t/core/modules/script-loader';
	import {
		createWindowDebug,
		resolveWindowDebugMode,
	} from '@c15t/core/modules/window-debug';
	import { createIAB } from '@c15t/iab';
	import type { IABHandle } from '@c15t/iab';
	import { generateThemeCSS } from '@c15t/ui/theme';
	import { deepMerge, setupColorScheme } from '@c15t/ui/utils';
	import type { Snippet } from 'svelte';
	import { onDestroy, onMount, untrack } from 'svelte';

	import { setConsentContext, setThemeContext } from '../context.svelte';
	import type { ConsentDraftState, SvelteIABState } from '../context.svelte';
	import type {
		ConsentManagerOptions,
		ProviderIABOptions,
		UsePersistenceOptions,
	} from '../types';

	const ALL_CONSENTS_ON: ConsentState = {
		experience: true,
		functionality: true,
		marketing: true,
		measurement: true,
		necessary: true,
	};

	const DEFAULT_TRANSLATIONS: KernelTranslations = {
		language: 'en',
		translations: defaultTranslationConfig.translations.en as never,
	};

	type ProviderOptionsInput = Omit<ConsentManagerOptions, 'mode'> & {
		mode?: ConsentManagerOptions['mode'];
	};

	type ConsentManagerProviderProps =
		| (ConsentManagerOptions & {
				children?: Snippet;
				options?: ProviderOptionsInput;
		  })
		| (ProviderOptionsInput & {
				children?: Snippet;
				options: ConsentManagerOptions;
		  });

	let props: ConsentManagerProviderProps = $props();

	const mergeDefinedOptions = function mergeDefinedOptions(
		base: ProviderOptionsInput,
		overrides: ProviderOptionsInput
	): ProviderOptionsInput {
		const merged = { ...base };
		for (const [key, value] of Object.entries(overrides) as [
			keyof ConsentManagerOptions,
			ConsentManagerOptions[keyof ConsentManagerOptions],
		][]) {
			if (value !== undefined) {
				merged[key] = value as never;
			}
		}
		return merged;
	};

	const resolveProviderOptions = function resolveProviderOptions({
		children: _children,
		options: nestedOptions = {},
		...topLevelOptions
	}: ConsentManagerProviderProps): ProviderOptionsInput {
		return mergeDefinedOptions(nestedOptions, topLevelOptions);
	};

	const children = $derived(props.children);
	const options = $derived(resolveProviderOptions(props));

	const normalizeUser = function normalizeUser(
		user: ConsentManagerOptions['user']
	): KernelUser | undefined {
		if (!user) {
			return undefined;
		}
		if ('externalId' in user) {
			return user;
		}
		const legacy = user as User;
		return {
			externalId: legacy.id,
			identityProvider: legacy.identityProvider,
		};
	};

	const resolveI18nTranslations = function resolveI18nTranslations(
		i18n: Partial<I18nConfig> | undefined
	): KernelTranslations | undefined {
		if (!i18n?.messages) {
			return undefined;
		}
		const language =
			i18n.locale ?? defaultTranslationConfig.defaultLanguage ?? 'en';
		const fallbackTranslations = defaultTranslationConfig.translations
			.en as TranslationsResponse;
		const selected =
			i18n.messages[language] ?? i18n.messages.en ?? fallbackTranslations;
		const base =
			defaultTranslationConfig.translations[
				language as keyof typeof defaultTranslationConfig.translations
			] ?? fallbackTranslations;
		return {
			language,
			translations: deepMerge(base, selected) as TranslationsResponse,
		};
	};

	const getEnabled = function getEnabled(
		providerOptions: ProviderOptionsInput
	): boolean {
		return providerOptions.enabled ?? true;
	};

	const getProviderMode = function getProviderMode(
		providerOptions: ProviderOptionsInput
	): ProviderTransportFactory {
		if (typeof providerOptions.mode !== 'function') {
			throw new Error(
				'c15t v3 ConsentManagerProvider: `mode` is required. Use hosted(), offline(), or custom().'
			);
		}
		return providerOptions.mode;
	};

	const getStorageConfig = function getStorageConfig(
		providerOptions: ProviderOptionsInput
	) {
		return providerOptions.storageConfig;
	};

	const normalizePersistenceOptions = function normalizePersistenceOptions():
		| UsePersistenceOptions
		| false
		| undefined {
		if (options.persistence === false) {
			return false;
		}
		const storageConfig = getStorageConfig(options);
		if (options.persistence === true || options.persistence === undefined) {
			return { storageConfig };
		}
		return {
			skipHydration: options.persistence.skipHydration,
			storageConfig: options.persistence.storageConfig ?? storageConfig,
		};
	};

	const getProviderCallbacks = function getProviderCallbacks(
		providerOptions: ProviderOptionsInput
	): Callbacks | undefined {
		return providerOptions.callbacks;
	};

	const getProviderIab = function getProviderIab(
		providerOptions: ProviderOptionsInput
	): ProviderIABOptions | undefined {
		return providerOptions.iab;
	};

	const buildNoBannerPolicy =
		function buildNoBannerPolicy(): KernelConfig['initialPolicy'] {
			return {
				id: 'no_banner',
				model: 'none',
				ui: {
					mode: 'none',
				},
			};
		};

	// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
	const createProviderKernel = function createProviderKernel(
		providerOptions: ProviderOptionsInput
	): ConsentKernel {
		const enabled = getEnabled(providerOptions);
		const prefetch = providerOptions.prefetch ?? {};
		const { offlinePolicy } = providerOptions;
		const i18nTranslations =
			resolveI18nTranslations(providerOptions.i18n) ?? DEFAULT_TRANSLATIONS;

		const transportContext: ProviderTransportContext = {
			consentCategories: providerOptions.consentCategories,
			offlinePolicy,
			policies: providerOptions.policies,
			prefetch,
			translations: i18nTranslations,
		};
		const baseTransport = getProviderMode(providerOptions)(transportContext);

		return createConsentKernel({
			...prefetch,
			initialConsents: enabled
				? (prefetch.initialConsents ?? undefined)
				: ALL_CONSENTS_ON,
			initialOverrides: {
				...(prefetch.initialOverrides ?? {}),
				...(providerOptions.overrides ?? {}),
			},
			initialPolicy:
				enabled === false
					? (prefetch.initialPolicy ?? buildNoBannerPolicy())
					: (prefetch.initialPolicy ?? offlinePolicy?.policy),
			initialPolicyDecision:
				prefetch.initialPolicyDecision ?? offlinePolicy?.policyDecision,
			initialPolicySnapshotToken:
				prefetch.initialPolicySnapshotToken ??
				offlinePolicy?.policySnapshotToken,
			initialTranslations: prefetch.initialTranslations ?? i18nTranslations,
			initialUser: normalizeUser(providerOptions.user) ?? prefetch.initialUser,
			transport: baseTransport,
		});
	};

	const kernel = untrack(() => createProviderKernel(options));

	let earlyPersistence: ReturnType<typeof createPersistence> | null = null;
	const initialEnabled = untrack(() => getEnabled(options));
	const initialPersistenceOptions = untrack(() =>
		normalizePersistenceOptions()
	);

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
		reset() {
			draftValues = {};
		},
		async save(categories) {
			const allowed = new Set<string>(categories);
			await kernel.commands.save(
				Object.fromEntries(
					Object.entries(draftValues).filter(([name]) => allowed.has(name))
				)
			);
			draftValues = {};
		},
		set(name, value) {
			draftValues = { ...draftValues, [name]: value };
		},
		get values() {
			return draftValues;
		},
	};

	const getIABState = function getIABState(): SvelteIABState | null {
		const { iab } = snapshot;
		if (!iab) {
			return null;
		}
		const noop = () => {
			/* empty */
		};
		const noopAsync = async () => {
			/* empty */
		};
		return {
			...iab,
			acceptAll: iabHandle?.acceptAll ?? noop,
			config: {
				cmpId: iab.cmpId,
				enabled: iab.enabled,
			},
			isLoadingGVL: iab.enabled && !iab.gvl,
			nonIABVendors: iab.customVendors,
			preferenceCenterTab: iabTab,
			rejectAll: iabHandle?.rejectAll ?? noop,
			save: iabHandle?.save ?? noopAsync,
			setPreferenceCenterTab(tab) {
				iabTab = tab;
			},
			setPurposeConsent: iabHandle?.setPurposeConsent ?? noop,
			setPurposeLegitimateInterest:
				iabHandle?.setPurposeLegitimateInterest ?? noop,
			setSpecialFeatureOptIn: iabHandle?.setSpecialFeatureOptIn ?? noop,
			setVendorConsent: iabHandle?.setVendorConsent ?? noop,
			setVendorLegitimateInterest:
				iabHandle?.setVendorLegitimateInterest ?? noop,
		};
	};

	setConsentContext(kernel, {
		getConsentCategories: () => configuredCategories,
		getDraft: () => draft,
		getIAB: getIABState,
		getLegalLinks: () => options.legalLinks,
		getSnapshot: () => snapshot,
	});

	const unsubscribe = kernel.subscribe((next) => {
		snapshot = next;
	});

	const stringifyError = function stringifyError(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}
		if (typeof error === 'string') {
			return error;
		}
		try {
			return JSON.stringify(error);
		} catch {
			return String(error);
		}
	};

	const categoriesWithValue = function categoriesWithValue(
		next: ConsentSnapshot,
		value: boolean
	) {
		return Object.entries(next.consents)
			.filter(([, enabled]) => enabled === value)
			.map(([category]) => category as AllConsentNames);
	};

	const snapshotConsentsChanged = function snapshotConsentsChanged(
		previous: ConsentSnapshot,
		next: ConsentSnapshot
	): boolean {
		return Object.keys(next.consents).some(
			(key) =>
				next.consents[key as AllConsentNames] !==
				previous.consents[key as AllConsentNames]
		);
	};

	const hasRevokedConsent = function hasRevokedConsent(
		previous: ConsentSnapshot,
		next: ConsentSnapshot
	) {
		if (!previous.hasConsented) {
			return false;
		}
		return Object.keys(previous.consents).some((key) => {
			const category = key as AllConsentNames;
			return (
				category !== 'necessary' &&
				previous.consents[category] &&
				!next.consents[category]
			);
		});
	};

	const wireCallbacks = function wireCallbacks(
		callbacks: Callbacks | undefined
	) {
		let saveStartedSnapshot: ConsentSnapshot | null = null;
		const reloadOnConsentRevoked = options.reloadOnConsentRevoked !== false;
		const subscriptions = [
			kernel.events.on('init:applied', ({ snapshot: next }) => {
				const decision = next.policyDecision as {
					jurisdiction?: unknown;
				} | null;
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
				if (!result.ok) {
					return;
				}
				const previous = saveStartedSnapshot;
				const next = kernel.getSnapshot();
				callbacks?.onConsentSet?.({
					preferences: next.consents as never,
				});
				if (previous && snapshotConsentsChanged(previous, next)) {
					callbacks?.onConsentChanged?.({
						allowedCategories: categoriesWithValue(next, true),
						deniedCategories: categoriesWithValue(next, false),
						preferences: next.consents as never,
						previousAllowedCategories: categoriesWithValue(previous, true),
						previousDeniedCategories: categoriesWithValue(previous, false),
						previousPreferences: previous.consents as never,
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
			for (const dispose of subscriptions) {
				dispose();
			}
		};
	};

	const disposeCallbacks = untrack(() =>
		wireCallbacks(getProviderCallbacks(options))
	);
	let hasSkippedInitialOverridesInit = false;

	const normalizeIabOptions = function normalizeIabOptions(
		iab: ProviderIABOptions | undefined
	) {
		if (iab === false || !iab || iab.enabled === false) {
			return null;
		}
		const currentIab = kernel.getSnapshot().iab;
		const cmpId = iab.cmpId ?? currentIab?.cmpId;
		if (typeof cmpId !== 'number') {
			return null;
		}
		return {
			...iab,
			cmpId,
			cmpVersion:
				typeof iab.cmpVersion === 'string'
					? Number(iab.cmpVersion)
					: iab.cmpVersion,
			customVendors: iab.customVendors ?? currentIab?.customVendors,
			gvl: iab.gvl ?? currentIab?.gvl ?? undefined,
		};
	};

	onMount(() => {
		const disposers: (() => void)[] = [];
		disposers.push(() => kernel.dispose());
		const enabled = getEnabled(options);
		const persistenceOptions = normalizePersistenceOptions();

		const windowDebug = createWindowDebug({
			mode: resolveWindowDebugMode(getProviderMode(options)),
			pkg: '@c15t/svelte',
		});
		disposers.push(() => windowDebug.dispose());

		if (enabled && persistenceOptions) {
			const persistence =
				earlyPersistence ??
				createPersistence({
					kernel,
					skipHydration: true,
					storageConfig: persistenceOptions.storageConfig,
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
			void (async () => {
				await kernel.commands.init();
				if (kernel.getSnapshot().hasConsented) {
					kernel.set.activeUI('none');
				}
			})();
		}

		if (enabled && options.scripts && options.scripts.length > 0) {
			const loader = createScriptLoader({
				kernel,
				onDebug: options.scriptLoader?.onDebug,
				scripts: options.scripts,
			});
			disposers.push(() => loader.dispose());
		}

		if (enabled && options.networkBlocker) {
			const blocker = createNetworkBlocker({
				enabled: options.networkBlocker.enabled,
				kernel,
				logBlockedRequests: options.networkBlocker.logBlockedRequests,
				onRequestBlocked: options.networkBlocker.onRequestBlocked,
				rules: options.networkBlocker.rules,
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

		if (enabled && getProviderIab(options)) {
			let iabMounted = false;
			const mountIabIfReady = () => {
				if (iabMounted) {
					return;
				}
				const iabOptions = normalizeIabOptions(getProviderIab(options));
				if (!iabOptions) {
					return;
				}
				iabMounted = true;
				const handle = createIAB({ ...iabOptions, kernel });
				iabHandle = handle;
				disposers.push(() => {
					handle.dispose();
					iabHandle = null;
					iabMounted = false;
				});
			};

			mountIabIfReady();
			disposers.push(kernel.subscribe(mountIabIfReady));
		}

		return () => {
			for (const dispose of disposers.reverse()) {
				dispose();
			}
		};
	});

	$effect(() => {
		configuredCategories = options.consentCategories ?? [];
	});

	$effect(() => {
		const nextUser = normalizeUser(options.user);
		if (nextUser) {
			void (async () => {
				try {
					await kernel.commands.identify(nextUser);
				} catch {
					// Provider callbacks receive the command:error event.
				}
			})();
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
			void (async () => {
				await kernel.commands.init();
				if (kernel.getSnapshot().hasConsented) {
					kernel.set.activeUI('none');
				}
			})();
		}
	});

	$effect(() => {
		if (getEnabled(options)) {
			return;
		}
		kernel.set.consent(ALL_CONSENTS_ON);
		kernel.set.activeUI('none');
		kernel.set.hasConsented(true);
	});

	let prefersReducedMotion = $state(false);

	onMount(() => {
		if (typeof window === 'undefined' || !window.matchMedia) {
			return;
		}
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		prefersReducedMotion = mediaQuery.matches;

		const handler = (event: MediaQueryListEvent) => {
			prefersReducedMotion = event.matches;
		};
		mediaQuery.addEventListener('change', handler);
		return () => mediaQuery.removeEventListener('change', handler);
	});

	const userTheme = $derived(options.theme);

	setThemeContext({
		get colorScheme() {
			return options.colorScheme;
		},
		get disableAnimation() {
			return options.disableAnimation ?? prefersReducedMotion;
		},
		get legalLinks() {
			return options.legalLinks;
		},
		get noStyle() {
			return options.noStyle;
		},
		get scrollLock() {
			return options.scrollLock;
		},
		get theme() {
			return userTheme;
		},
		get trapFocus() {
			return options.trapFocus ?? true;
		},
	});

	const themeCSS = $derived(userTheme ? generateThemeCSS(userTheme) : '');

	let themeStyleEl: HTMLStyleElement | null = null;
	let ownedStyleEl = false;

	$effect(() => {
		if (typeof document === 'undefined') {
			return;
		}
		if (!themeCSS) {
			if (ownedStyleEl && themeStyleEl) {
				themeStyleEl.remove();
				themeStyleEl = null;
				ownedStyleEl = false;
			}
			return;
		}
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
		if (options.colorScheme === null || options.colorScheme === undefined) {
			return;
		}
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
