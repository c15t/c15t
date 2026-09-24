<script lang="ts">
	import type {
		ConsentSnapshot,
		ConsentState,
		KernelOverrides,
		KernelUser,
		OptionalConsentCategory,
	} from '@c15t/core';
	import { deniedVendorIds, vendorRenders } from '@c15t/core';
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
	/** Vendor grants the visitor moved, over the seeded map. */
	let draftVendors = $state<Record<string, boolean>>({});
	/** The vendor list as it was when the first vendor moved. */
	let draftVendorSurface = $state<string | null>(null);

	/** Set an own property without going through the prototype for `__proto__`. */
	const setOwn = (
		target: Record<string, boolean>,
		key: string,
		value: boolean
	) => {
		Object.defineProperty(target, key, {
			configurable: true,
			enumerable: true,
			value,
			writable: true,
		});
	};
	/**
	 * Granted flag per declared vendor from the record: the denials the gate
	 * honors, so a stale denial for a vendor now `disabled` does not count.
	 */
	const seedVendors = (current: ConsentSnapshot): Record<string, boolean> => {
		const grants: Record<string, boolean> = {};
		if (current.model === 'iab') {
			return grants;
		}
		const denied = deniedVendorIds(current) ?? new Set<string>();
		for (const vendor of current.vendors?.declared ?? []) {
			setOwn(grants, vendor.id, !denied.has(vendor.id));
		}
		return grants;
	};
	const toggleableVendor = (current: ConsentSnapshot, vendorId: string) =>
		current.model !== 'iab' &&
		(current.vendors?.declared ?? []).some(
			(vendor) => vendor.id === vendorId && vendor.disabled !== true
		);
	/**
	 * What the vendor rows are built from; a dirty draft goes stale when it
	 * changes. A declaration that cannot produce a row, such as a script
	 * registering only its slug, is not part of the surface.
	 */
	const vendorSurface = (current: ConsentSnapshot) =>
		current.model === 'iab'
			? ''
			: JSON.stringify(
					(current.vendors?.declared ?? [])
						.filter(vendorRenders)
						.map((vendor) => [
							vendor.id,
							vendor.disabled === true,
							vendor.category,
						])
				);
	/** The value a category shows before the visitor moves it. */
	const baselineValue = (
		current: ConsentSnapshot,
		name: OptionalConsentCategory
	) =>
		current.explicitChoice?.categories[name]?.value ??
		options.presentation?.preferences?.defaults?.[name] ??
		(current.policyRule.model === 'opt-out' ||
			current.policyRule.preselectedCategories.includes(name));
	/**
	 * Forget the policy and vendor surface once nothing is staged. Both maps
	 * hold only moved values, so a visitor who moves a switch and moves it
	 * back leaves nothing to review: a later declaration must not make the
	 * draft stale, and a later policy must not find a value staged under
	 * the old one and save it. A save that fails never settles, so its draft
	 * stays for the retry.
	 */
	const settleDraft = () => {
		if (
			Object.keys(draftValues).length === 0 &&
			Object.keys(draftVendors).length === 0
		) {
			draftFingerprint = null;
			draftScope = null;
			draftVendorSurface = null;
		}
	};
	let iabHandle = $state<IABHandle | null>(
		untrack(() => runtime.iab as IABHandle | null)
	);
	let iabTab = $state<'purposes' | 'vendors'>('purposes');

	const draft: ConsentDraftState = {
		get isStale() {
			return (
				(draftFingerprint !== null &&
					(draftFingerprint !== snapshot.evaluationPolicy.choice.fingerprint ||
						draftScope !==
							(
								snapshot.evaluationPolicy.choiceScope ??
								snapshot.policyRule.scope
							).join(','))) ||
				(draftVendorSurface !== null &&
					draftVendorSurface !== vendorSurface(snapshot))
			);
		},
		reset() {
			draftRevision += 1;
			draftValues = {};
			draftVendors = {};
			draftFingerprint = null;
			draftScope = null;
			draftVendorSurface = null;
		},
		async save(categories) {
			const revision = draftRevision;
			draftSaveSequence += 1;
			const sequence = draftSaveSequence;
			const current = kernel.getSnapshot();
			if (
				(draftFingerprint !== null &&
					(draftFingerprint !== current.evaluationPolicy.choice.fingerprint ||
						draftScope !==
							(
								current.evaluationPolicy.choiceScope ?? current.policyRule.scope
							).join(','))) ||
				(draftVendorSurface !== null &&
					draftVendorSurface !== vendorSurface(current))
			) {
				throw new Error(
					'The policy changed. Review your preferences before saving.'
				);
			}
			const { values } = draft;
			// Only the vendors the draft moved travel with the save, so an
			// untouched vendor never renews its recorded confirmation time.
			const seeded = seedVendors(current);
			const moved: Record<string, boolean> = {};
			for (const [id, granted] of Object.entries(draft.vendors)) {
				if (seeded[id] !== granted) {
					setOwn(moved, id, granted);
				}
			}
			const result = await kernel.commands.save({
				...Object.fromEntries(
					(current.evaluationPolicy.choiceScope ?? current.policyRule.scope)
						.filter(
							(name) => categories === undefined || categories.includes(name)
						)
						.map((name) => [name, values[name]])
				),
				...(Object.keys(moved).length > 0 && { vendors: moved }),
			});
			if (!result.ok) {
				throw new Error('Unable to save preferences.');
			}
			if (sequence !== draftSaveSequence) {
				return;
			}
			if (revision === draftRevision) {
				draft.reset();
				return;
			}
			// The visitor edited while the save was in flight. What was sent
			// is the baseline now, so a submitted entry the visitor did not
			// move again leaves the draft, or it would override a record
			// another surface writes later; edits made after the submit stay.
			const nextValues: Partial<ConsentState> = {};
			for (const [name, staged] of Object.entries(draftValues)) {
				if (values[name as OptionalConsentCategory] !== staged) {
					nextValues[name as OptionalConsentCategory] = staged;
				}
			}
			draftValues = nextValues;
			const nextVendors: Record<string, boolean> = {};
			for (const [id, staged] of Object.entries(draftVendors)) {
				if (moved[id] !== staged) {
					setOwn(nextVendors, id, staged);
				}
			}
			draftVendors = nextVendors;
			settleDraft();
		},
		set(name, value) {
			if (name === 'necessary') {
				return;
			}
			const current = kernel.getSnapshot();
			draftRevision += 1;
			draftFingerprint ??= current.evaluationPolicy.choice.fingerprint;
			draftScope ??= (
				current.evaluationPolicy.choiceScope ?? current.policyRule.scope
			).join(',');
			// A category edit reviews the vendor rows too: a vendor declared
			// under it later was not what the visitor saw.
			draftVendorSurface ??= vendorSurface(current);
			// Only moved categories are staged, like the vendor map.
			const next: Partial<ConsentState> = {};
			for (const [key, staged] of Object.entries(draftValues)) {
				if (key !== name) {
					next[key as OptionalConsentCategory] = staged;
				}
			}
			if (value !== baselineValue(current, name)) {
				next[name] = value;
			}
			draftValues = next;
			settleDraft();
		},
		setVendor(vendorId, granted) {
			const current = kernel.getSnapshot();
			if (!toggleableVendor(current, vendorId)) {
				return;
			}
			draftRevision += 1;
			draftFingerprint ??= current.evaluationPolicy.choice.fingerprint;
			draftScope ??= (
				current.evaluationPolicy.choiceScope ?? current.policyRule.scope
			).join(',');
			draftVendorSurface ??= vendorSurface(current);
			// Only moved vendors are staged. A vendor put back to its seeded
			// value leaves the map, or the entry would outlive the seed and
			// override a record another island writes later.
			const next: Record<string, boolean> = {};
			for (const [id, value] of Object.entries(draftVendors)) {
				if (id !== vendorId) {
					setOwn(next, id, value);
				}
			}
			if (granted !== seedVendors(current)[vendorId]) {
				setOwn(next, vendorId, granted);
			}
			draftVendors = next;
			settleDraft();
		},
		get values() {
			return {
				necessary: true,
				...Object.fromEntries(
					(
						snapshot.evaluationPolicy.choiceScope ?? snapshot.policyRule.scope
					).map((name) => [
						name,
						draftValues[name] ?? baselineValue(snapshot, name),
					])
				),
			};
		},
		get vendors() {
			const seeded = seedVendors(snapshot);
			for (const [id, granted] of Object.entries(draftVendors)) {
				if (toggleableVendor(snapshot, id)) {
					setOwn(seeded, id, granted);
				}
			}
			return seeded;
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
