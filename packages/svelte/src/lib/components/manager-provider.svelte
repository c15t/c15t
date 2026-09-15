<script lang="ts">
	import type {
		ConsentSnapshot,
		ConsentState,
		KernelOverrides,
		KernelUser,
	} from '@c15t/core';
	import { applyExperimentAssignment } from '@c15t/core';
	import {
		createConsentRuntime,
		normalizeKernelUser,
	} from '@c15t/core/runtime';
	import type { ConsentRuntime } from '@c15t/core/runtime';
	import type { IABHandle } from '@c15t/iab';
	import { generateThemeCSS } from '@c15t/ui/theme';
	import { setupColorScheme } from '@c15t/ui/utils';
	import type { Snippet } from 'svelte';
	import { onDestroy, onMount, untrack } from 'svelte';

	import { setConsentContext, setThemeContext } from '../context.svelte';
	import type { ConsentDraftState, SvelteIABState } from '../context.svelte';
	import { isIABConfigured, lazyCreateIAB } from '../iab-loader';
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
	let draftScope = $state<string | null>(null);
	let draftFingerprint = $state<string | null>(null);
	let draftRevision = 0;
	let draftSaveSequence = 0;
	let draftValues = $state<Partial<ConsentState>>({});
	let iabHandle = $state<IABHandle | null>(
		untrack(() => runtime.iab as IABHandle | null)
	);
	let iabTab = $state<'purposes' | 'vendors'>('purposes');

	const draft: ConsentDraftState = {
		get isStale() {
			return (
				draftFingerprint !== null &&
				(draftFingerprint !== snapshot.evaluationPolicy.choice.fingerprint ||
					draftScope !==
						(
							snapshot.evaluationPolicy.choiceScope ?? snapshot.policyRule.scope
						).join(','))
			);
		},
		reset() {
			draftRevision += 1;
			draftValues = {};
			draftFingerprint = null;
			draftScope = null;
		},
		async save(categories) {
			const revision = draftRevision;
			draftSaveSequence += 1;
			const sequence = draftSaveSequence;
			const current = kernel.getSnapshot();
			if (
				draftFingerprint !== null &&
				(draftFingerprint !== current.evaluationPolicy.choice.fingerprint ||
					draftScope !==
						(
							current.evaluationPolicy.choiceScope ?? current.policyRule.scope
						).join(','))
			) {
				throw new Error(
					'The policy changed. Review your preferences before saving.'
				);
			}
			const { values } = draft;
			const result = await kernel.commands.save(
				Object.fromEntries(
					(current.evaluationPolicy.choiceScope ?? current.policyRule.scope)
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
			draftScope ??= (
				kernel.getSnapshot().evaluationPolicy.choiceScope ??
				kernel.getSnapshot().policyRule.scope
			).join(',');
			draftValues = { ...draftValues, [name]: value };
		},
		get values() {
			return {
				necessary: true,
				...Object.fromEntries(
					(
						snapshot.evaluationPolicy.choiceScope ?? snapshot.policyRule.scope
					).map((name) => [
						name,
						draftValues[name] ??
							snapshot.explicitChoice?.categories[name]?.value ??
							applyExperimentAssignment(
								options.presentation,
								options.experiment,
								snapshot.experiment
							)?.preferences?.defaults?.[name] ??
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

	setConsentContext(kernel, {
		clearRecords: () => runtime.clearRecords(),
		getConsentCategories: () => [
			'necessary',
			...(snapshot.evaluationPolicy.choiceScope ?? snapshot.policyRule.scope),
		],
		getDraft: () => draft,
		getExperiment: () => options.experiment,
		getIAB: getIABState,
		getLegalLinks: () => options.legalLinks,
		getPresentation: () => options.presentation,
		getSnapshot: () => snapshot,
	});

	const unsubscribe = kernel.subscribe((next) => {
		snapshot = next;
	});

	// The lazy handle queues calls until `@c15t/iab` lands and replays them,
	// so the surfaces render against it as soon as it exists.
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

	// What the runtime carried before this provider pushed anything, so
	// removing the prop restores that rather than leaving the last pushed
	// list in place. Only restored if this provider did the pushing: a
	// borrowed runtime's categories belong to whoever owns it.
	const initialCategories = untrack(() => [
		...(kernel.getSnapshot().consentCategories ?? []),
	]);
	let pushedCategories = false;

	$effect(() => {
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
			return options.trapFocus;
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
		// A nonce-based CSP rejects the injected block without it.
		if (options.nonce) {
			themeStyleEl.nonce = options.nonce;
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
