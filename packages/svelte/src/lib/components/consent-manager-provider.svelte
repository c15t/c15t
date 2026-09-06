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
	import type {
		ConsentRuntime,
		ConsentRuntimeIABHandle,
	} from '@c15t/core/runtime';
	import type { IABHandle } from '@c15t/iab';
	import { generateThemeCSS } from '@c15t/ui/theme';
	import { setupColorScheme } from '@c15t/ui/utils';
	import type { Snippet } from 'svelte';
	import { onDestroy, onMount, untrack } from 'svelte';

	import { setConsentContext, setThemeContext } from '../context.svelte';
	import type { ConsentDraftState, SvelteIABState } from '../context.svelte';
	import { isIABConfigured, lazyCreateIAB, whenIABReady } from '../iab-loader';
	import type { ConsentManagerOptions } from '../types';

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
				// Only an app that configured IAB reaches for `@c15t/iab`, and
				// even then the module arrives through a dynamic import.
				createIAB: isIABConfigured(options.iab) ? lazyCreateIAB : undefined,
				mode: options.mode as ConsentManagerOptions['mode'],
				pkg: '@c15t/svelte',
			})
		);
	const { kernel } = runtime;

	let snapshot = $state<ConsentSnapshot>(kernel.getSnapshot());
	let draftFingerprint = $state<string | null>(null);
	let draftRevision = 0;
	let draftSaveSequence = 0;
	let draftValues = $state<Partial<ConsentState>>({});
	let iabHandle = $state<IABHandle | null>(
		untrack(() => runtime.iab as IABHandle | null)
	);
	// The handle the lazy factory returns forwards nothing until
	// `@c15t/iab` lands. Surfaces stay unrendered until it has.
	let iabHandleReady = $state(false);
	let iabTab = $state<'purposes' | 'vendors'>('purposes');
	let configuredCategories = $state<AllConsentNames[]>(
		untrack(() => options.consentCategories ?? runtime.consentCategories)
	);

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

	// A handle that has not resolved yet answers every call with
	// `undefined`; rendering the preference centre against it would give the
	// visitor inert toggles, so surfaces wait for the real one.
	const resolvedIABHandle = function resolvedIABHandle(): {
		handle: IABHandle | null;
		pending: boolean;
	} {
		if (!iabHandle) {
			return { handle: null, pending: false };
		}
		return {
			handle: iabHandleReady ? iabHandle : null,
			pending: !iabHandleReady,
		};
	};

	const getIABState = function getIABState(): SvelteIABState | null {
		const { iab } = snapshot;
		const { handle: readyHandle, pending } = resolvedIABHandle();
		if (!iab || pending) {
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
			acceptAll: readyHandle?.acceptAll ?? noop,
			config: {
				cmpId: iab.cmpId,
				enabled: iab.enabled,
			},
			isLoadingGVL: iab.enabled && !iab.gvl,
			nonIABVendors: iab.customVendors,
			preferenceCenterTab: iabTab,
			rejectAll: readyHandle?.rejectAll ?? noop,
			save: readyHandle?.save ?? noopAsync,
			setPreferenceCenterTab(tab) {
				iabTab = tab;
			},
			setPurposeConsent: readyHandle?.setPurposeConsent ?? noop,
			setPurposeLegitimateInterest:
				readyHandle?.setPurposeLegitimateInterest ?? noop,
			setSpecialFeatureOptIn: readyHandle?.setSpecialFeatureOptIn ?? noop,
			setVendorConsent: readyHandle?.setVendorConsent ?? noop,
			setVendorLegitimateInterest:
				readyHandle?.setVendorLegitimateInterest ?? noop,
		};
	};

	setConsentContext(kernel, {
		clearRecords: () => runtime.clearRecords(),
		getConsentCategories: () => [
			'necessary',
			...snapshot.policyRule.scope.filter(
				(name) =>
					!configuredCategories.length || configuredCategories.includes(name)
			),
		],
		getDraft: () => draft,
		getIAB: getIABState,
		getLegalLinks: () => options.legalLinks,
		getPresentation: () => options.presentation,
		getSnapshot: () => snapshot,
	});

	const unsubscribe = kernel.subscribe((next) => {
		snapshot = next;
	});

	// `$state` wraps the assigned handle in its own proxy, so identity is
	// tracked with a counter rather than by comparing references.
	let iabGeneration = 0;

	// A borrowed runtime was built by another package, with its own lazy
	// IAB factory. This package's `whenIABReady()` knows nothing about that
	// load and resolves immediately, which would mark an empty proxy ready
	// and hand the surfaces no-op consent methods. The handle carries its
	// own readiness signal, so prefer it and keep the local loader only for
	// a runtime this provider created.
	const awaitIABReady = function awaitIABReady(
		handle: ConsentRuntimeIABHandle
	): Promise<void> {
		const { whenReady } = handle;
		return typeof whenReady === 'function'
			? whenReady.call(handle)
			: whenIABReady();
	};

	const awaitIABHandle = function awaitIABHandle(
		handle: ConsentRuntimeIABHandle,
		generation: number
	) {
		void (async () => {
			await awaitIABReady(handle);
			if (generation === iabGeneration) {
				iabHandleReady = true;
			}
		})();
	};

	const unsubscribeIAB = runtime.onIABChange((next) => {
		iabHandle = next as IABHandle | null;
		iabHandleReady = false;
		iabGeneration += 1;
		if (!next) {
			return;
		}
		awaitIABHandle(next, iabGeneration);
	});

	// A provider that borrows a runtime — an Astro island, say — mounts
	// after the CMP was created, so `onIABChange` has already fired and
	// will not fire again. Without this the surfaces waited forever on a
	// handle that had been ready since before the component existed.
	const initialHandle = untrack(() => iabHandle);
	if (initialHandle) {
		awaitIABHandle(initialHandle, iabGeneration);
	}

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

	// What the runtime carried before this provider pushed anything, so
	// removing the prop restores that rather than leaving the last pushed
	// list in place. Only restored if this provider did the pushing: a
	// borrowed runtime's categories belong to whoever owns it.
	const initialCategories = untrack(() => runtime.consentCategories);
	let pushedCategories = false;

	$effect(() => {
		configuredCategories = consentCategoriesOption ?? initialCategories;
		if (consentCategoriesOption) {
			runtime.setConsentCategories(consentCategoriesOption);
			pushedCategories = true;
			return;
		}
		if (pushedCategories) {
			runtime.setConsentCategories(initialCategories);
			pushedCategories = false;
		}
	});

	let lastIdentifiedKey: string | null = null;

	$effect(() => {
		if (!ownsRuntime) {
			return;
		}
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
		if (!ownsRuntime) {
			return;
		}
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
		if (!hasSkippedInitialOverridesInit) {
			hasSkippedInitialOverridesInit = true;
			return;
		}
		runtime.setOverrides(overrides);
		if (enabledOption) {
			void runtime.reinit();
		}
	});

	$effect(() => {
		if (!ownsRuntime || enabledOption) {
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
