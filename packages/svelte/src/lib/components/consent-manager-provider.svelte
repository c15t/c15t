<script lang="ts">
	import type {
		AllConsentNames,
		ConsentSnapshot,
		ConsentState,
		KernelOverrides,
		KernelUser,
	} from '@c15t/core';
	import {
		createConsentRuntime,
		normalizeKernelUser,
	} from '@c15t/core/runtime';
	import type { ConsentRuntime } from '@c15t/core/runtime';
	import { createIAB } from '@c15t/iab';
	import type { IABHandle } from '@c15t/iab';
	import { generateThemeCSS } from '@c15t/ui/theme';
	import { setupColorScheme } from '@c15t/ui/utils';
	import type { Snippet } from 'svelte';
	import { onDestroy, onMount, untrack } from 'svelte';

	import { setConsentContext, setThemeContext } from '../context.svelte';
	import type { ConsentDraftState, SvelteIABState } from '../context.svelte';
	import type { ConsentManagerOptions } from '../types';

	const ALL_CONSENTS_ON: ConsentState = {
		experience: true,
		functionality: true,
		marketing: true,
		measurement: true,
		necessary: true,
	};

	type ProviderOptionsInput = Omit<ConsentManagerOptions, 'mode'> & {
		mode?: ConsentManagerOptions['mode'];
	};

	interface ProviderRuntimeProps {
		children?: Snippet;
		/**
		 * An externally owned runtime to render instead of creating one.
		 *
		 * A SvelteKit root layout or an Astro page can create a single
		 * runtime with `createConsentRuntime()` and share it across
		 * component trees that cannot see each other's context. The
		 * provider neither starts nor disposes a runtime it did not
		 * create — the owner does both.
		 */
		runtime?: ConsentRuntime;
	}

	type ConsentManagerProviderProps =
		| (ConsentManagerOptions &
				ProviderRuntimeProps & {
					options?: ProviderOptionsInput;
				})
		| (ProviderOptionsInput &
				ProviderRuntimeProps & {
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
		runtime: _runtime,
		options: nestedOptions = {},
		...topLevelOptions
	}: ConsentManagerProviderProps): ProviderOptionsInput {
		return mergeDefinedOptions(nestedOptions, topLevelOptions);
	};

	const children = $derived(props.children);
	const options = $derived(resolveProviderOptions(props));

	// The runtime owns the kernel and every side-effecting module. When one
	// is handed in, its owner is also responsible for `start()`/`dispose()`.
	const externalRuntime = untrack(() => props.runtime);
	const ownsRuntime = externalRuntime === undefined;
	const runtime: ConsentRuntime =
		externalRuntime ??
		untrack(() =>
			createConsentRuntime({
				...options,
				createIAB,
				mode: options.mode as ConsentManagerOptions['mode'],
				pkg: '@c15t/svelte',
			})
		);
	const { kernel } = runtime;

	let snapshot = $state<ConsentSnapshot>(kernel.getSnapshot());
	let draftValues = $state<Partial<ConsentState>>({});
	let iabHandle = $state<IABHandle | null>(
		untrack(() => runtime.iab as IABHandle | null)
	);
	let iabTab = $state<'purposes' | 'vendors'>('purposes');
	let configuredCategories = $state<AllConsentNames[]>(
		untrack(() => options.consentCategories ?? runtime.consentCategories)
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

	const unsubscribeIAB = runtime.onIABChange((next) => {
		iabHandle = next as IABHandle | null;
	});

	onMount(() => {
		if (!ownsRuntime) {
			return;
		}
		runtime.start();
		snapshot = kernel.getSnapshot();
		return () => {
			// Drop the IAB listener first: disposing the runtime emits a
			// final `null` and this component is already tearing down.
			unsubscribeIAB();
			runtime.dispose();
		};
	});

	// Each of the effects below reads one narrow value rather than the whole
	// derived `options` object. Reading `options` would tie them to every
	// prop — a new inline `options={{ theme }}` would re-run `identify()`
	// and fire a second `init()` on a theme change.
	const userOption = $derived(options.user);
	const overridesOption = $derived(options.overrides);
	const consentCategoriesOption = $derived(options.consentCategories);
	const enabledOption = $derived(options.enabled ?? true);

	// Every field `identify()` sends, in a fixed order. Keying on a subset
	// would swallow an update: same `externalId`, new `properties`, no call.
	const userKey = function userKey(
		user: KernelUser | undefined
	): string | null {
		if (!user) {
			return null;
		}
		return JSON.stringify([
			user.externalId,
			user.externalIdType,
			user.identityProvider,
			user.properties,
		]);
	};

	$effect(() => {
		configuredCategories =
			consentCategoriesOption ?? untrack(() => runtime.consentCategories);
		if (consentCategoriesOption) {
			runtime.setConsentCategories(consentCategoriesOption);
		}
	});

	let lastIdentifiedKey: string | null = null;

	$effect(() => {
		const nextUser = normalizeKernelUser(userOption);
		const key = userKey(nextUser);
		if (key === null || key === lastIdentifiedKey) {
			return;
		}
		lastIdentifiedKey = key;
		void runtime.identify(nextUser);
	});

	let lastOverridesKey: string | null = null;
	let hasSkippedInitialOverridesInit = false;

	$effect(() => {
		const overrides: KernelOverrides = overridesOption ?? {};
		const key = JSON.stringify(
			Object.entries(overrides).sort(([left], [right]) =>
				left.localeCompare(right)
			)
		);
		if (key === lastOverridesKey) {
			return;
		}
		lastOverridesKey = key;
		runtime.setOverrides(overrides);
		if (!hasSkippedInitialOverridesInit) {
			hasSkippedInitialOverridesInit = true;
			return;
		}
		if (enabledOption) {
			void runtime.reinit();
		}
	});

	$effect(() => {
		if (enabledOption) {
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
		unsubscribeIAB();
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
