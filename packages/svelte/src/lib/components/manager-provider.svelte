<script lang="ts">
	import type { ConsentKernel, ConsentSnapshot } from '@c15t/core';
	import {
		applyExperimentAssignment,
		applyExperimentTheme,
		IABUnavailableError,
		policyNeedsIAB,
		watchRevocationReload,
	} from '@c15t/core';
	import { createIframeBlocker } from '@c15t/core/modules/iframe-blocker';
	import { createPersistence } from '@c15t/core/modules/persistence';
	import { createWindowDebug } from '@c15t/core/modules/window-debug';
	import type {
		createPreferenceDraft,
		PreferenceDraft,
		PreferenceDraftState,
	} from '@c15t/core/preference-draft';
	import {
		mountRuntimeIAB,
		onDemandRuntimeModules,
	} from '@c15t/core/runtime/on-demand';
	import { createConsentProviderRuntime } from '@c15t/core/runtime/provider';
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
	import { isIABConfigured, lazyCreateIAB, loadGPP } from '../iab-loader';
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
		// Called only when `gpp` is set, so other apps never fetch the chunk.
		loadGPP,
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
	// preload them from the server-rendered head. The same on the server and
	// in the browser, so hydration keeps it.
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
	//
	// `@c15t/core/preference-draft` is not on first load. `ConsentWidget`
	// (and so the dialog chunk) imports it and hands it over while it
	// renders, on the server too. Without one, the first read or write of
	// the draft loads it; until it lands, `values` and `vendors` are empty,
	// `isStale` is `false`, and writes wait in order for it.
	type CreatePreferenceDraft = typeof createPreferenceDraft;
	const EMPTY: Readonly<Record<string, boolean>> = Object.freeze({});
	let createDraft: CreatePreferenceDraft | null = null;
	let preferenceDraft: PreferenceDraft | null = null;
	let draftState = $state.raw<PreferenceDraftState | null>(null);
	let stopDraft = () => {
		/* no draft yet */
	};
	let waiting: ((draft: PreferenceDraft) => void)[] = [];
	let draftLoad: Promise<PreferenceDraft> | undefined;

	const startDraft = function startDraft(next: ConsentKernel): PreferenceDraft {
		stopDraft();
		const started = (createDraft as CreatePreferenceDraft)(next, {
			defaults: untrack(draftDefaults),
		});
		preferenceDraft = started;
		draftState = started.getState();
		stopDraft = started.subscribe(() => {
			draftState = started.getState();
		});
		return started;
	};
	const provideDraft = function provideDraft(
		create: CreatePreferenceDraft
	): PreferenceDraft {
		if (preferenceDraft) {
			return preferenceDraft;
		}
		createDraft = create;
		const started = startDraft(kernel);
		for (const apply of waiting.splice(0)) {
			apply(started);
		}
		return started;
	};
	const importDraft = async function importDraft(): Promise<PreferenceDraft> {
		try {
			const module = await import('@c15t/core/preference-draft');
			return provideDraft(module.createPreferenceDraft);
		} catch (error) {
			// The next read or write retries.
			draftLoad = undefined;
			throw error;
		}
	};
	const loadDraft = function loadDraft(): Promise<PreferenceDraft> {
		if (preferenceDraft) {
			return Promise.resolve(preferenceDraft);
		}
		draftLoad ??= importDraft();
		return draftLoad;
	};
	/** Load the draft for a read; the read is reactive and fills in. */
	const requestDraft = async function requestDraft(): Promise<void> {
		if (preferenceDraft || typeof window === 'undefined') {
			return;
		}
		try {
			await loadDraft();
		} catch {
			/* retried on the next read or write */
		}
	};
	const withDraft = function withDraft(
		apply: (draft: PreferenceDraft) => void
	): void {
		if (preferenceDraft) {
			apply(preferenceDraft);
			return;
		}
		waiting.push(apply);
		void requestDraft();
	};
	const followDraft = (next: ConsentKernel) => {
		if (createDraft) {
			startDraft(next);
		}
	};
	$effect(() => {
		const defaults = draftDefaults();
		preferenceDraft?.setDefaults(defaults);
	});
	let iabHandle = $state<IABHandle | null>(
		untrack(() => runtime.iab as IABHandle | null)
	);
	let iabTab = $state<'purposes' | 'vendors'>('purposes');

	const draft: ConsentDraftState = {
		get isStale() {
			void requestDraft();
			return draftState?.isStale ?? false;
		},
		reset() {
			// Nothing is staged before the draft exists but the waiting writes.
			waiting = [];
			preferenceDraft?.reset();
		},
		async save(categories) {
			// A loaded draft records in this task, so the surface closes in the
			// click task.
			const current = preferenceDraft ?? (await loadDraft());
			if (current.getState().isStale) {
				throw new Error(
					'The policy changed. Review your preferences before saving.'
				);
			}
			const result = await current.save({ categories });
			if (!result.ok) {
				throw new Error('Unable to save preferences.');
			}
		},
		set(name, value) {
			withDraft((current) => current.set(name, value));
		},
		setVendor(vendorId, granted) {
			withDraft((current) => current.setVendor(vendorId, granted));
		},
		get values() {
			void requestDraft();
			return draftState?.values ?? EMPTY;
		},
		get vendors() {
			void requestDraft();
			return draftState?.vendors ?? EMPTY;
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
		// The draft's displayed categories, without loading the draft: the
		// runtime applies the same display-order rule. Reading `snapshot`
		// re-runs a reactive reader when the policy changes.
		getConsentCategories: () => {
			void snapshot;
			return runtime.consentCategories;
		},
		getDraft: () => draft,
		getExperiment: () => experiment,
		getIAB: getIABState,
		getLegalLinks: () => options.legalLinks,
		getPresentation: () => options.presentation,
		getSnapshot: () => snapshot,
		getTheme: () => options.theme,
		provideDraft,
		setLanguage: (code) => runtime.setLanguage(code),
	});

	let unsubscribe = initialKernel.subscribe((next) => {
		snapshot = next;
	});

	// IAB is opt-in. Without `iab` no CMP answers for an `iab` policy, and
	// the standard banner does not handle it, so the visitor would get no
	// consent UI. Throw from the render instead, on the server and in the
	// browser. A borrowed runtime's owner configures IAB, not this provider.
	const iabUnavailable = $derived(
		ownsRuntime && !isIABConfigured(options.iab) && policyNeedsIAB(snapshot)
	);
	const throwIABUnavailable = function throwIABUnavailable(): never {
		throw new IABUnavailableError(
			'`iab` is not set',
			'Set `iab` on <ConsentManagerProvider> and render <IABConsentBanner>'
		);
	};

	// The lazy handle queues calls until `@c15t/iab` lands and replays them,
	// so the surfaces render against it as soon as it exists.
	const unsubscribeIAB = runtime.subscribe(() => {
		iabHandle = runtime.iab as IABHandle | null;
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
		get nonce() {
			return options.nonce;
		},
		get preloadDialog() {
			return options.preloadDialog;
		},
		get scrollLock() {
			return options.scrollLock;
		},
		get styles() {
			return options.styles;
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
	{#if preloadMarker}
		<meta
			name="c15t-modulepreload"
			content={preloadMarker}
		/>
	{/if}
</svelte:head>

{#if iabUnavailable}
	{throwIABUnavailable()}
{:else if children}
	{@render children()}
{/if}
