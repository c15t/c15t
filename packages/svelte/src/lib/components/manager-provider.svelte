<script lang="ts">
	import type { ConsentKernel, ConsentSnapshot } from '@c15t/core';
	import {
		applyExperimentAssignment,
		applyExperimentTheme,
		watchRevocationReload,
	} from '@c15t/core';
	import { createIframeBlocker } from '@c15t/core/modules/iframe-blocker';
	import { createPersistence } from '@c15t/core/modules/persistence';
	import { createWindowDebug } from '@c15t/core/modules/window-debug';
	import { createPreferenceDraft } from '@c15t/core/preference-draft';
	import type { PreferenceDraft } from '@c15t/core/preference-draft';
	import {
		createConsentProviderRuntime,
		mountRuntimeIAB,
		onDemandRuntimeModules,
	} from '@c15t/core/runtime/provider';
	import type {
		ConsentProviderRuntime,
		ConsentRuntime,
	} from '@c15t/core/runtime/provider';
	import type { IABHandle } from '@c15t/iab';
	import { setupColorScheme } from '@c15t/ui/utils';
	import type { Snippet } from 'svelte';
	import { onDestroy, onMount, untrack } from 'svelte';

	import { setConsentContext, setThemeContext } from '../context.svelte';
	import type { ConsentDraftState, SvelteIABState } from '../context.svelte';
	import { isIABConfigured, lazyCreateIAB } from '../iab-loader';
	import { modulePreloadMarker } from '../module-preload';
	import { warnOnUnappliedThemeTokens } from '../theme-warning';
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
	const runtimeOptions = () => ({
		...options,
		// Only an app that configured IAB reaches for `@c15t/iab`, and even
		// then the module arrives through a dynamic import.
		createIAB: isIABConfigured(options.iab) ? lazyCreateIAB : undefined,
		mode: options.mode as ConsentManagerOptions['mode'],
		pkg: '@c15t/svelte',
	});
	const ownedRuntime: ConsentProviderRuntime | undefined = ownsRuntime
		? untrack(() =>
				createConsentProviderRuntime(runtimeOptions(), {
					// The script loader, network blocker, data clearing and a
					// `consentSource` connection load on demand, each only when
					// configured.
					...onDemandRuntimeModules,
					createIframeBlocker,
					createPersistence,
					createWindowDebug,
					mountIAB: mountRuntimeIAB,
					watchRevocationReload,
				})
			)
		: undefined;
	// Names the on-demand chunks this page starts with, so `c15tHandle` can
	// preload them from the server-rendered head. The same string on the
	// server and in the browser, so hydration keeps it.
	const preloadMarker = ownsRuntime
		? untrack(() => modulePreloadMarker(options))
		: '';
	const runtime: ConsentRuntime =
		externalRuntime ?? (ownedRuntime as ConsentRuntime);
	// The runtime validated and assigned from the experiment it was created
	// with (the server's, else `options.experiment`), so presentation, theme
	// and draft defaults resolve against that same definition; a later
	// `options.experiment` is ignored.
	const { experiment } = runtime;

	// The rendered kernel. An owned runtime swaps it when `enabled` toggles.
	const initialKernel = runtime.kernel;
	let kernel = $state.raw<ConsentKernel>(initialKernel);
	let snapshot = $state<ConsentSnapshot>(initialKernel.getSnapshot());

	/** Presentation defaults of the arm this visitor runs. */
	const draftDefaults = () =>
		applyExperimentAssignment(
			options.presentation,
			experiment,
			snapshot.experiment
		)?.preferences?.defaults;
	// One draft per provider, so the headless state API and the dialog stage
	// into the same one. It follows the rendered kernel.
	let preferenceDraft: PreferenceDraft = createPreferenceDraft(initialKernel, {
		defaults: untrack(draftDefaults),
	});
	let draftState = $state.raw(preferenceDraft.getState());
	let stopDraft = preferenceDraft.subscribe(() => {
		draftState = preferenceDraft.getState();
	});
	const followDraft = (next: ConsentKernel) => {
		stopDraft();
		preferenceDraft = createPreferenceDraft(next, {
			defaults: untrack(draftDefaults),
		});
		draftState = preferenceDraft.getState();
		stopDraft = preferenceDraft.subscribe(() => {
			draftState = preferenceDraft.getState();
		});
	};
	$effect(() => {
		preferenceDraft.setDefaults(draftDefaults());
	});
	let iabHandle = $state<IABHandle | null>(
		untrack(() => runtime.iab as IABHandle | null)
	);
	let iabTab = $state<'purposes' | 'vendors'>('purposes');

	const draft: ConsentDraftState = {
		get isStale() {
			return draftState.isStale;
		},
		reset() {
			preferenceDraft.reset();
		},
		async save(categories) {
			if (preferenceDraft.getState().isStale) {
				throw new Error(
					'The policy changed. Review your preferences before saving.'
				);
			}
			const result = await preferenceDraft.save({ categories });
			if (!result.ok) {
				throw new Error('Unable to save preferences.');
			}
		},
		set(name, value) {
			preferenceDraft.set(name, value);
		},
		setVendor(vendorId, granted) {
			preferenceDraft.setVendor(vendorId, granted);
		},
		get values() {
			return draftState.values;
		},
		get vendors() {
			return draftState.vendors;
		},
	};

	const getIABState = function getIABState(): SvelteIABState | null {
		const { iab } = snapshot;
		if (!iab) {
			return null;
		}
		// Rendering keys on the kernel state so a server-resolved GVL puts the
		// IAB surfaces in the first HTML. Until `@c15t/iab` lands the lazy
		// handle queues calls and replays them, so an early Accept still
		// records consent; without any handle the actions are no-ops.
		const readyHandle = iabHandle;
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

	setConsentContext(() => kernel, {
		clearRecords: () => runtime.clearRecords(),
		getConsentCategories: () => [...draftState.displayedCategories],
		getDraft: () => draft,
		getExperiment: () => experiment,
		getIAB: getIABState,
		getLegalLinks: () => options.legalLinks,
		getPresentation: () => options.presentation,
		getSnapshot: () => snapshot,
		getTheme: () => options.theme,
		setLanguage: (code) => runtime.setLanguage(code),
	});

	let unsubscribe = initialKernel.subscribe((next) => {
		snapshot = next;
	});

	// The lazy handle queues calls until `@c15t/iab` lands and replays them,
	// so the surfaces render against it as soon as it exists.
	const unsubscribeIAB = runtime.onIABChange((next) => {
		iabHandle = next as IABHandle | null;
	});
	// Turning `enabled` off renders a permissive kernel; follow it.
	const unsubscribeRuntime = ownedRuntime?.subscribe(() => {
		if (ownedRuntime.kernel === kernel) {
			return;
		}
		unsubscribe();
		({ kernel } = ownedRuntime);
		snapshot = kernel.getSnapshot();
		followDraft(kernel);
		unsubscribe = kernel.subscribe((next) => {
			snapshot = next;
		});
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

	// The runtime compares the new options with the last ones and applies
	// only what changed, so a theme-only change identifies nobody and asks
	// the backend nothing.
	$effect(() => {
		// It rejects when its chunk fails to load. Requests held for new rules
		// have failed closed by then, and the next update loads it again.
		// oxlint-disable-next-line promise/prefer-await-to-then -- An effect cannot await, and it must read the options synchronously to track them.
		ownedRuntime?.update(runtimeOptions()).catch(() => undefined);
	});

	// A borrowed runtime belongs to its owner, who configures it; categories
	// the provider names are still offered.
	const consentCategoriesOption = $derived(options.consentCategories);
	$effect(() => {
		if (!ownsRuntime && consentCategoriesOption) {
			runtime.setConsentCategories(consentCategoriesOption);
		}
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

	// The arm's theme overrides ride on the host theme, so the injected
	// tokens and the theme context both follow the assignment.
	const userTheme = $derived(
		applyExperimentTheme(options.theme, experiment, snapshot.experiment)
	);

	// Development only. Tokens need `generateThemeCSS` output in the page.
	$effect(() => {
		warnOnUnappliedThemeTokens(userTheme);
	});

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
		get preloadDialog() {
			return options.preloadDialog;
		},
		get scrollLock() {
			return options.scrollLock;
		},
		get theme() {
			return userTheme;
		},
		get trapFocus() {
			return options.trapFocus;
		},
	});

	// Unset mirrors a `dark` class on `<html>`, as in React and Vue. `null`
	// leaves `c15t-dark` to the site, or to a host that owns the class, such
	// as the Astro page runtime behind a dialog island.
	$effect(() => {
		if (options.colorScheme === null) {
			return;
		}
		return setupColorScheme(options.colorScheme);
	});

	onDestroy(() => {
		unsubscribe();
		unsubscribeIAB();
		unsubscribeRuntime?.();
		stopDraft();
	});
</script>

<svelte:head>
	{@html preloadMarker}
</svelte:head>

{#if children}
	{@render children()}
{/if}
