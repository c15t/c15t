<script lang="ts">
	import { createConsentKernel, defaultTranslationConfig } from '@c15t/core';
	import type {
		AllConsentNames,
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
	import type { IABHandle } from '@c15t/iab';
	import { resolvePolicyRules } from '@c15t/schema/types';
	import { generateThemeCSS } from '@c15t/ui/theme';
	import { deepMerge, setupColorScheme } from '@c15t/ui/utils';
	import type { Snippet } from 'svelte';
	import { onDestroy, onMount, untrack } from 'svelte';

	import { setConsentContext, setThemeContext } from '../context.svelte';
	import type { ConsentDraftState, SvelteIABState } from '../context.svelte';
	import type {
		ConsentManagerOptions,
		ConsentProviderCallbacks,
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
	): ConsentProviderCallbacks | undefined {
		return providerOptions.callbacks;
	};

	const getProviderIab = function getProviderIab(
		providerOptions: ProviderOptionsInput
	): ProviderIABOptions | undefined {
		return providerOptions.iab;
	};

	const DISABLED_RESOLUTION = resolvePolicyRules({
		countryCode: null,
		regionCode: null,
		rules: [
			{
				id: 'disabled',
				match: { fallback: true },
				model: 'opt-out',
				prompt: 'none',
			},
		],
	});

	// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
	const createProviderKernel = function createProviderKernel(
		providerOptions: ProviderOptionsInput
	): ConsentKernel {
		const enabled = getEnabled(providerOptions);
		const prefetch = providerOptions.prefetch ?? {};

		const i18nTranslations =
			resolveI18nTranslations(providerOptions.i18n) ?? DEFAULT_TRANSLATIONS;

		const transportContext: ProviderTransportContext = {
			consentCategories: providerOptions.consentCategories,
			prefetch,
			translations: i18nTranslations,
		};
		const baseTransport = getProviderMode(providerOptions)(transportContext);

		return createConsentKernel({
			...prefetch,
			initialOverrides: {
				...(prefetch.initialOverrides ?? {}),
				...(providerOptions.overrides ?? {}),
			},
			initialPolicyPending:
				prefetch.initialPolicyPending ??
				(enabled && !prefetch.initialPolicyResolution),
			initialPolicyResolution: enabled
				? prefetch.initialPolicyResolution
				: DISABLED_RESOLUTION,
			initialTranslations: prefetch.initialTranslations ?? i18nTranslations,
			initialUser: normalizeUser(providerOptions.user) ?? prefetch.initialUser,
			transport: baseTransport,
		});
	};

	const kernel = untrack(() => createProviderKernel(options));

	let snapshot = $state<ConsentSnapshot>(kernel.getSnapshot());
	let draftValues = $state<Partial<ConsentState>>({});
	let iabHandle = $state<IABHandle | null>(null);
	let iabTab = $state<'purposes' | 'vendors'>('purposes');
	let configuredCategories = $state<AllConsentNames[]>(
		untrack(() => options.consentCategories ?? [])
	);

	let draftFingerprint = $state<string | null>(null);
	let draftRevision = 0;
	let draftSaveSequence = 0;
	const draft: ConsentDraftState = {
		get isStale() {
			return (
				draftFingerprint !== null &&
				draftFingerprint !== snapshot.evaluationPolicy.choice.fingerprint
			);
		},
		reset() {
			draftRevision += 1;
			draftValues = {};
			draftFingerprint = null;
		},
		async save(categories) {
			const revision = draftRevision;
			draftSaveSequence += 1;
			const sequence = draftSaveSequence;
			const current = kernel.getSnapshot();
			if (
				draftFingerprint !== null &&
				draftFingerprint !== current.evaluationPolicy.choice.fingerprint
			) {
				throw new Error(
					'The policy changed. Review your preferences before saving.'
				);
			}
			const { values } = draft;
			const result = await kernel.commands.save(
				Object.fromEntries(
					current.policyRule.scope
						.filter(
							(name) =>
								configuredCategories.length === 0 ||
								configuredCategories.includes(name)
						)
						.filter(
							(name) => categories === undefined || categories.includes(name)
						)
						.map((name) => [name, values[name]])
				)
			);
			if (!result.ok) {
				throw new Error('Unable to save preferences.');
			}
			if (revision === draftRevision && sequence === draftSaveSequence) {
				draft.reset();
			}
		},
		set(name, value) {
			if (name === 'necessary') {
				return;
			}
			draftRevision += 1;
			draftFingerprint ??=
				kernel.getSnapshot().evaluationPolicy.choice.fingerprint;
			draftValues = { ...draftValues, [name]: value };
		},
		get values() {
			return {
				necessary: true,
				...Object.fromEntries(
					snapshot.policyRule.scope.map((name) => [
						name,
						draftValues[name] ??
							snapshot.explicitChoice?.categories[name]?.value ??
							options.presentation?.preferences?.defaults?.[name] ??
							(snapshot.policyRule.model === 'opt-out' ||
								snapshot.policyRule.preselectedCategories.includes(name)),
					])
				),
			};
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

	let clearPersistedRecords: (() => void) | null = null;
	setConsentContext(kernel, {
		clearRecords: () => {
			if (clearPersistedRecords) {
				clearPersistedRecords();
			} else {
				kernel.hydrate({
					choice: null,
					noticeDismissal: null,
					optOutDirectives: [],
					subject: null,
				});
				kernel.events.emit({ type: 'records:cleared' });
			}
		},
		getConsentCategories: () => configuredCategories,
		getDraft: () => draft,
		getIAB: getIABState,
		getLegalLinks: () => options.legalLinks,
		getPresentation: () => options.presentation,
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

	const wireCallbacks = (callbacks: ConsentProviderCallbacks | undefined) => {
		const subscriptions = [
			kernel.events.on('choice:recorded', ({ type: _type, ...event }) =>
				callbacks?.onChoiceRecorded?.(event)
			),
			kernel.events.on('permissions:changed', ({ type: _type, ...event }) =>
				callbacks?.onPermissionsChanged?.(event)
			),
			kernel.events.on('command:error', (event) =>
				callbacks?.onError?.({ error: stringifyError(event.error) })
			),
		];
		return () => subscriptions.forEach((dispose) => dispose());
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

	const activatePreparedPrivacy = () => {
		const { gpc } = kernel.getSnapshot().privacySignals;
		if (gpc.detected && gpc.active) {
			kernel.set.privacySignals({ gpc: true });
		}
	};
	const isPrepared = (providerOptions: ProviderOptionsInput) =>
		providerOptions.prefetch?.initialPolicyResolution !== undefined &&
		providerOptions.prefetch?.initialPolicyPending !== true;
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

		const prepared = isPrepared(options);
		if (enabled && persistenceOptions) {
			const persistence = createPersistence({
				kernel,
				skipHydration:
					persistenceOptions.skipHydration ??
					Boolean(options.prefetch?.initialRecords),
				storageConfig: persistenceOptions.storageConfig,
			});
			clearPersistedRecords = persistence.clear;
			disposers.push(() => {
				clearPersistedRecords = null;
				persistence.dispose();
			});
		}
		if (enabled && prepared) {
			kernel.hydrate({ now: kernel.getServerSnapshot().evaluatedAt });
			activatePreparedPrivacy();
		} else if (enabled) {
			void kernel.commands.init();
		}

		if (enabled && options.scripts?.length) {
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
			let cancelled = false;
			disposers.push(() => {
				cancelled = true;
			});
			const mountIabIfReady = async () => {
				if (iabMounted) {
					return;
				}
				const iabOptions = normalizeIabOptions(getProviderIab(options));
				if (!iabOptions) {
					return;
				}
				iabMounted = true;
				const { createIAB } = await import('@c15t/iab');
				if (cancelled) {
					return;
				}
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
			})();
		}
	});

	$effect(() => {
		if (getEnabled(options)) {
			return;
		}

		kernel.set.activeUI('none');
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
