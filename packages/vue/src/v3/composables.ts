/**
 * Vue composables over the v3 kernel.
 *
 * Each composable uses `shallowRef` + `onScopeDispose` to subscribe to
 * the kernel. Vue's reactivity system dedupes DOM updates the same way
 * React's scheduler batches commits — if a selector returns a value that
 * `Object.is` matches the previous value, the ref's value is replaced by
 * reference equality and no watcher fires.
 *
 * This is the Vue-side proof of the framework-neutral kernel contract:
 * the same kernel drives both React (`useSyncExternalStore`) and Vue
 * (`shallowRef` + subscribe) with no adapter-side workarounds.
 */
import type { AllConsentNames } from 'c15t';
import type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	KernelActiveUI,
	KernelBranding,
	KernelIABState,
	KernelModel,
	KernelOverrides,
	KernelTranslations,
	KernelUser,
	LocationResponse,
	PolicyDecision,
	PolicyScopeMode,
	PolicyUiSurfaceConfig,
	ResolvedPolicy,
} from 'c15t/v3';
import { inject, onScopeDispose, type Ref, shallowRef } from 'vue';
import { kernelInjectionKey } from './context';

function useKernel(): ConsentKernel {
	const kernel = inject(kernelInjectionKey, null);
	if (!kernel) {
		throw new Error(
			'c15t: no kernel in Vue injection scope. Wrap with <ConsentProvider :kernel="kernel" /> from @c15t/vue/v3 or call provide(kernelInjectionKey, kernel) yourself.'
		);
	}
	return kernel;
}

/**
 * Internal helper: subscribe to the kernel, store the selected slice in
 * a `shallowRef`. Updates only fire when the selected value changes
 * under `Object.is` — same semantics as React's
 * `useSyncExternalStore` selector pattern.
 */
function useKernelSelector<T>(
	selector: (snap: ConsentSnapshot) => T
): Readonly<Ref<T>> {
	const kernel = useKernel();
	const ref = shallowRef(selector(kernel.getSnapshot()));

	const unsubscribe = kernel.subscribe((snap) => {
		const next = selector(snap);
		if (!Object.is(next, ref.value)) {
			ref.value = next;
		}
	});

	onScopeDispose(unsubscribe);

	return ref;
}

/**
 * Full snapshot ref. Escape hatch — prefer narrow composables for
 * re-render isolation.
 */
export function useSnapshot(): Readonly<Ref<ConsentSnapshot>> {
	return useKernelSelector((snap) => snap);
}

/** Has a specific category been granted? Primitive boolean. */
export function useConsent(category: AllConsentNames): Readonly<Ref<boolean>> {
	return useKernelSelector((snap) => snap.consents[category]);
}

/** Full consent record. */
export function useConsents(): Readonly<Ref<Readonly<ConsentState>>> {
	return useKernelSelector((snap) => snap.consents);
}

/** Has the user completed any consent interaction. */
export function useHasConsented(): Readonly<Ref<boolean>> {
	return useKernelSelector((snap) => snap.hasConsented);
}

/** Current overrides (country, region, language, GPC). */
export function useOverrides(): Readonly<Ref<Readonly<KernelOverrides>>> {
	return useKernelSelector((snap) => snap.overrides);
}

/** Identified user or null. */
export function useUser(): Readonly<Ref<Readonly<KernelUser> | null>> {
	return useKernelSelector((snap) => snap.user);
}

// -- Rich-init selectors ---------------------------------------------------

/** Geographic context reported by the backend. */
export function useLocation(): Readonly<
	Ref<Readonly<LocationResponse> | null>
> {
	return useKernelSelector((snap) => snap.location);
}

/** Active translation bundle. */
export function useTranslations(): Readonly<
	Ref<Readonly<KernelTranslations> | null>
> {
	return useKernelSelector((snap) => snap.translations);
}

/** Active branding identifier. */
export function useBranding(): Readonly<Ref<KernelBranding | null>> {
	return useKernelSelector((snap) => snap.branding);
}

/** Full resolved policy from `/init`. */
export function usePolicy(): Readonly<Ref<Readonly<ResolvedPolicy> | null>> {
	return useKernelSelector((snap) => snap.policy);
}

/** Policy-decision explainability metadata. */
export function usePolicyDecision(): Readonly<
	Ref<Readonly<PolicyDecision> | null>
> {
	return useKernelSelector((snap) => snap.policyDecision);
}

/** Derived consent model (opt-in / opt-out / iab / null). */
export function useModel(): Readonly<Ref<KernelModel>> {
	return useKernelSelector((snap) => snap.model);
}

/** Which UI surface to render (none / banner / dialog). */
export function useActiveUI(): Readonly<Ref<KernelActiveUI>> {
	return useKernelSelector((snap) => snap.activeUI);
}

/** Category allowlist from `policy.consent.categories`. */
export function usePolicyCategories(): Readonly<
	Ref<readonly AllConsentNames[]>
> {
	return useKernelSelector((snap) => snap.policyCategories);
}

/** `strict` or `permissive` — from `policy.consent.scopeMode`. */
export function usePolicyScopeMode(): Readonly<Ref<PolicyScopeMode>> {
	return useKernelSelector((snap) => snap.policyScopeMode);
}

/** UI hints for the banner surface. */
export function usePolicyBanner(): Readonly<
	Ref<Readonly<PolicyUiSurfaceConfig> | null>
> {
	return useKernelSelector((snap) => snap.policyBanner);
}

/** UI hints for the dialog surface. */
export function usePolicyDialog(): Readonly<
	Ref<Readonly<PolicyUiSurfaceConfig> | null>
> {
	return useKernelSelector((snap) => snap.policyDialog);
}

/** Full IAB state slice (null when IAB is not enabled). */
export function useIABSnapshot(): Readonly<
	Ref<Readonly<KernelIABState> | null>
> {
	return useKernelSelector((snap) => snap.iab);
}

/** Is IAB active? */
export function useIABEnabled(): Readonly<Ref<boolean>> {
	return useKernelSelector((snap) => snap.iab?.enabled ?? false);
}

/** Consent for a specific IAB vendor. */
export function useVendorConsent(
	vendorId: string | number
): Readonly<Ref<boolean>> {
	const key = String(vendorId);
	return useKernelSelector((snap) => snap.iab?.vendorConsents[key] ?? false);
}

/** Consent for a specific IAB purpose (1–11). */
export function usePurposeConsent(purposeId: number): Readonly<Ref<boolean>> {
	return useKernelSelector(
		(snap) => snap.iab?.purposeConsents[purposeId] ?? false
	);
}

/** Opt-in for a special feature (1 = geolocation, 2 = device ID). */
export function useSpecialFeatureOptIn(
	featureId: number
): Readonly<Ref<boolean>> {
	return useKernelSelector(
		(snap) => snap.iab?.specialFeatureOptIns[featureId] ?? false
	);
}

/** Latest TCF string. `null` until the IAB module encodes one. */
export function useTCString(): Readonly<Ref<string | null>> {
	return useKernelSelector((snap) => snap.iab?.tcString ?? null);
}

// -- Action composables -----------------------------------------------------

/** Stable ref to the sync consent-setter. */
export function useSetConsent(): ConsentKernel['set']['consent'] {
	return useKernel().set.consent;
}

/** Stable ref to the sync overrides-setter. */
export function useSetOverrides(): ConsentKernel['set']['overrides'] {
	return useKernel().set.overrides;
}

/** Stable ref to the sync language-setter. */
export function useSetLanguage(): ConsentKernel['set']['language'] {
	return useKernel().set.language;
}

/** Stable ref to the sync IAB-setter. */
export function useSetIAB(): ConsentKernel['set']['iab'] {
	return useKernel().set.iab;
}

/** Stable ref to the async save command. */
export function useSaveConsents(): ConsentKernel['commands']['save'] {
	return useKernel().commands.save;
}

/** Stable ref to the async identify command. */
export function useIdentify(): ConsentKernel['commands']['identify'] {
	return useKernel().commands.identify;
}

/** Stable ref to the async init command. */
export function useInit(): ConsentKernel['commands']['init'] {
	return useKernel().commands.init;
}
