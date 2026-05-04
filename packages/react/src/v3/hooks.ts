/**
 * v3 React hooks.
 *
 * Every selector hook uses `useSyncExternalStore` to subscribe to the
 * kernel. The server snapshot equals the client snapshot (kernel state
 * is deterministic from config), so SSR hydration is free — no
 * tearing, no flash.
 *
 * The selectors follow the "useSyncExternalStore with selector" pattern:
 * subscribe to all kernel changes, but narrow the returned value to the
 * slice we care about. React only schedules a re-render if the slice
 * `Object.is`-differs. A child reading `useConsent('marketing')` does
 * not re-render when `useConsent('measurement')` flips elsewhere.
 *
 * Action hooks return stable references (the kernel's own methods).
 * Consumers do not need `useCallback`. Under React Compiler this is
 * safe because actions don't produce values — they cause state changes
 * observed through the selector hooks, whose subscription model handles
 * invalidation correctly.
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
import { useContext, useSyncExternalStore } from 'react';
import { KernelContext } from './context';

function useKernel(): ConsentKernel {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error(
			'c15t: no kernel in context. Wrap your app with <ConsentProvider options={...}> from @c15t/react/v3.'
		);
	}
	return kernel;
}

function subscribe(kernel: ConsentKernel, listener: () => void): () => void {
	return kernel.subscribe(listener);
}

function useKernelSelector<T>(selector: (snap: ConsentSnapshot) => T): T {
	const kernel = useKernel();
	return useSyncExternalStore(
		(listener) => subscribe(kernel, listener),
		() => selector(kernel.getSnapshot()),
		() => selector(kernel.getSnapshot())
	);
}

/**
 * Full snapshot accessor. Escape hatch for consumers that genuinely need
 * multiple slices. Prefer narrow hooks for re-render isolation.
 */
export function useSnapshot(): ConsentSnapshot {
	const kernel = useKernel();
	return useSyncExternalStore(
		(listener) => subscribe(kernel, listener),
		() => kernel.getSnapshot(),
		() => kernel.getSnapshot()
	);
}

/**
 * Has a specific category been granted? Primitive boolean; re-renders
 * only when that exact category flips.
 */
export function useConsent(category: AllConsentNames): boolean {
	return useKernelSelector((snap) => snap.consents[category]);
}

/**
 * Full consent record. Re-renders on any category change.
 */
export function useConsents(): Readonly<ConsentState> {
	return useKernelSelector((snap) => snap.consents);
}

/**
 * Whether the user has completed any consent interaction.
 */
export function useHasConsented(): boolean {
	return useKernelSelector((snap) => snap.hasConsented);
}

/**
 * Current overrides (country, region, language, GPC).
 */
export function useOverrides(): Readonly<KernelOverrides> {
	return useKernelSelector((snap) => snap.overrides);
}

/**
 * Identified user or null.
 */
export function useUser(): Readonly<KernelUser> | null {
	return useKernelSelector((snap) => snap.user);
}

// -- Rich-init selectors ---------------------------------------------------

/** Geographic context reported by the backend. */
export function useLocation(): Readonly<LocationResponse> | null {
	return useKernelSelector((snap) => snap.location);
}

/** Active translation bundle. */
export function useTranslations(): Readonly<KernelTranslations> | null {
	return useKernelSelector((snap) => snap.translations);
}

/** Active branding identifier. */
export function useBranding(): KernelBranding | null {
	return useKernelSelector((snap) => snap.branding);
}

/** Full resolved policy from `/init`. */
export function usePolicy(): Readonly<ResolvedPolicy> | null {
	return useKernelSelector((snap) => snap.policy);
}

/** Policy-decision explainability metadata. */
export function usePolicyDecision(): Readonly<PolicyDecision> | null {
	return useKernelSelector((snap) => snap.policyDecision);
}

/** Derived consent model (opt-in / opt-out / iab / null). */
export function useModel(): KernelModel {
	return useKernelSelector((snap) => snap.model);
}

/** Which UI surface to render (none / banner / dialog). */
export function useActiveUI(): KernelActiveUI {
	return useKernelSelector((snap) => snap.activeUI);
}

/** Category allowlist from `policy.consent.categories`. */
export function usePolicyCategories(): readonly AllConsentNames[] {
	return useKernelSelector((snap) => snap.policyCategories);
}

/** `strict` or `permissive` — from `policy.consent.scopeMode`. */
export function usePolicyScopeMode(): PolicyScopeMode {
	return useKernelSelector((snap) => snap.policyScopeMode);
}

/** UI hints for the banner surface. */
export function usePolicyBanner(): Readonly<PolicyUiSurfaceConfig> | null {
	return useKernelSelector((snap) => snap.policyBanner);
}

/** UI hints for the dialog surface. */
export function usePolicyDialog(): Readonly<PolicyUiSurfaceConfig> | null {
	return useKernelSelector((snap) => snap.policyDialog);
}

/** Full IAB state slice (null when IAB is not enabled). */
export function useIABSnapshot(): Readonly<KernelIABState> | null {
	return useKernelSelector((snap) => snap.iab);
}

/** Is IAB active? */
export function useIABEnabled(): boolean {
	return useKernelSelector((snap) => snap.iab?.enabled ?? false);
}

/** Consent for a specific IAB vendor. Accepts numeric or string IDs; IAB
 * vendors are numeric but the kernel stores them as strings for
 * uniformity with custom vendors. */
export function useVendorConsent(vendorId: string | number): boolean {
	const key = String(vendorId);
	return useKernelSelector((snap) => snap.iab?.vendorConsents[key] ?? false);
}

/** Consent for a specific IAB purpose (1–11). */
export function usePurposeConsent(purposeId: number): boolean {
	return useKernelSelector(
		(snap) => snap.iab?.purposeConsents[purposeId] ?? false
	);
}

/** Opt-in for a special feature (1 = geolocation, 2 = device ID). */
export function useSpecialFeatureOptIn(featureId: number): boolean {
	return useKernelSelector(
		(snap) => snap.iab?.specialFeatureOptIns[featureId] ?? false
	);
}

/** Latest TCF string. `null` until the IAB module encodes one. */
export function useTCString(): string | null {
	return useKernelSelector((snap) => snap.iab?.tcString ?? null);
}

// -- Action hooks -----------------------------------------------------------

/**
 * Sync mutation: apply a partial consent patch. No-op on equal values.
 */
export function useSetConsent(): (input: Partial<ConsentState>) => void {
	const kernel = useKernel();
	return kernel.set.consent;
}

/**
 * Sync mutation: apply overrides (country, region, language, GPC).
 */
export function useSetOverrides(): (input: KernelOverrides) => void {
	const kernel = useKernel();
	return kernel.set.overrides;
}

/**
 * Sync mutation: switch active language.
 */
export function useSetLanguage(): (code: string) => void {
	const kernel = useKernel();
	return kernel.set.language;
}

/**
 * Sync mutation: set the active UI surface (banner/dialog/none).
 */
export function useSetActiveUI(): (ui: KernelActiveUI) => void {
	const kernel = useKernel();
	return (
		kernel.set as typeof kernel.set & {
			activeUI(ui: KernelActiveUI): void;
		}
	).activeUI;
}

/**
 * Async command: persist current or given consents. Returns the kernel's
 * own save() method so identity is stable across renders.
 */
export function useSaveConsents(): ConsentKernel['commands']['save'] {
	const kernel = useKernel();
	return kernel.commands.save;
}

/**
 * Async command: identify a user.
 */
export function useIdentify(): ConsentKernel['commands']['identify'] {
	const kernel = useKernel();
	return kernel.commands.identify;
}

/**
 * Async command: run the init transport (currently a no-op in the kernel;
 * boot modules wire in SSR hydration, prefetch, banner fetch).
 */
export function useInit(): ConsentKernel['commands']['init'] {
	const kernel = useKernel();
	return kernel.commands.init;
}
