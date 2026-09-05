/**
 * v3 React hooks.
 *
 * Every selector hook uses `useSyncExternalStore` to subscribe to the
 * kernel. Hydration reads the immutable server snapshot. After hydration,
 * consumers read live state, including browser-only privacy signals.
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

import type {
	AllConsentNames,
	ConsentKernel,
	PromptPresentation,
	PreferencesPresentation,
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
	PolicyScopeMode,
} from '@c15t/core';
import { useCallback, useContext, useSyncExternalStore } from 'react';

import { KernelContext } from './context';
import { useUIConfig } from './ui-config-context';
import { invalidateConsentUIAction } from './ui-save';

const useKernel = function useKernel(): ConsentKernel {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error(
			'c15t: no kernel in context. Wrap your app with <ConsentProvider options={...}> from @c15t/react.'
		);
	}
	return kernel;
};

const subscribe = function subscribe(
	kernel: ConsentKernel,
	listener: () => void
): () => void {
	return kernel.subscribe(listener);
};

const useKernelSelector = function useKernelSelector<T>(
	selector: (snap: ConsentSnapshot) => T
): T {
	const kernel = useKernel();
	return useSyncExternalStore(
		(listener) => subscribe(kernel, listener),
		() => selector(kernel.getSnapshot()),
		// Hydration must render what the SERVER rendered. Client boot
		// mutations (sync persistence hydrate, eager init) can flip the live
		// snapshot before hydration completes — rendering the mutated state
		// here mismatches the server HTML and strands SSR'd consent UI as
		// unowned DOM (a banner React never removes).
		() => selector(kernel.getServerSnapshot())
	);
};

/**
 * Full snapshot accessor. Escape hatch for consumers that genuinely need
 * multiple slices. Prefer narrow hooks for re-render isolation.
 */
export const useSnapshot = function useSnapshot(): ConsentSnapshot {
	const kernel = useKernel();
	return useSyncExternalStore(
		(listener) => subscribe(kernel, listener),
		() => kernel.getSnapshot(),
		() => kernel.getServerSnapshot()
	);
};

/**
 * Has a specific category been granted? Primitive boolean; re-renders
 * only when that exact category flips.
 */
export const useConsent = function useConsent(
	category: AllConsentNames
): boolean {
	return useKernelSelector((snap) => snap.effectivePermissions[category]);
};

/**
 * Full consent record. Re-renders on any category change.
 */
export const useConsents = function useConsents(): Readonly<ConsentState> {
	return useKernelSelector((snap) => snap.effectivePermissions);
};

/**
 * Current overrides (country, region, language, GPC).
 */
export const useOverrides = function useOverrides(): Readonly<KernelOverrides> {
	return useKernelSelector((snap) => snap.overrides);
};

/**
 * Identified user or null.
 */
export const useUser = function useUser(): Readonly<KernelUser> | null {
	return useKernelSelector((snap) => snap.user);
};

// -- Rich-init selectors ---------------------------------------------------

/** Geographic context reported by the backend. */
export const useLocation =
	function useLocation(): Readonly<LocationResponse> | null {
		return useKernelSelector((snap) => snap.location);
	};

/** Active translation bundle. */
export const useTranslations =
	function useTranslations(): Readonly<KernelTranslations> | null {
		return useKernelSelector((snap) => snap.translations);
	};

/** Active branding identifier. */
export const useBranding = function useBranding(): KernelBranding | null {
	return useKernelSelector((snap) => snap.branding);
};

/** Derived consent model (opt-in / opt-out / iab / null). */
export const useModel = function useModel(): KernelModel {
	return useKernelSelector((snap) => snap.model);
};

/** Which UI surface to render (none / banner / dialog). */
export const useActiveUI = function useActiveUI(): KernelActiveUI {
	return useKernelSelector((snap) => snap.activeUI);
};

/** Category allowlist from `policy.consent.categories`. */
export const usePolicyCategories =
	function usePolicyCategories(): readonly AllConsentNames[] {
		return useKernelSelector((snap) => snap.policyRule.scope);
	};

/** `strict` or `permissive` — from `policy.consent.scopeMode`. */
export const usePolicyScopeMode =
	function usePolicyScopeMode(): PolicyScopeMode {
		return useKernelSelector((snap) => snap.policyRule.scopeMode);
	};

/** Full IAB state slice (null when IAB is not enabled). */
export const useIABSnapshot =
	function useIABSnapshot(): Readonly<KernelIABState> | null {
		return useKernelSelector((snap) => snap.iab);
	};

/** Is IAB active? */
export const useIABEnabled = function useIABEnabled(): boolean {
	return useKernelSelector((snap) => snap.iab?.enabled ?? false);
};

/** Consent for a specific IAB vendor. Accepts numeric or string IDs; IAB
 * vendors are numeric but the kernel stores them as strings for
 * uniformity with custom vendors. */
export const useVendorConsent = function useVendorConsent(
	vendorId: string | number
): boolean {
	const key = String(vendorId);
	return useKernelSelector((snap) => snap.iab?.vendorConsents[key] ?? false);
};

/** Consent for a specific IAB purpose (1–11). */
export const usePurposeConsent = function usePurposeConsent(
	purposeId: number
): boolean {
	return useKernelSelector(
		(snap) => snap.iab?.purposeConsents[purposeId] ?? false
	);
};

/** Opt-in for a special feature (1 = geolocation, 2 = device ID). */
export const useSpecialFeatureOptIn = function useSpecialFeatureOptIn(
	featureId: number
): boolean {
	return useKernelSelector(
		(snap) => snap.iab?.specialFeatureOptIns[featureId] ?? false
	);
};

/** Latest TCF string. `null` until the IAB module encodes one. */
export const useTCString = function useTCString(): string | null {
	return useKernelSelector((snap) => snap.iab?.tcString ?? null);
};

// -- Action hooks -----------------------------------------------------------

/**
 * Sync mutation: apply overrides (country, region, language, GPC).
 */
export const useSetOverrides = function useSetOverrides(): (
	input: KernelOverrides
) => void {
	const kernel = useKernel();
	return kernel.set.overrides;
};

/**
 * Sync mutation: switch active language.
 */
export const useSetLanguage = function useSetLanguage(): (
	code: string
) => void {
	const kernel = useKernel();
	return kernel.set.language;
};

/**
 * Sync mutation: set the active UI surface (banner/dialog/none).
 */
export const useSetActiveUI = function useSetActiveUI(): (
	ui: KernelActiveUI
) => void {
	const kernel = useKernel();
	return useCallback(
		(ui: KernelActiveUI) => {
			invalidateConsentUIAction(kernel);
			kernel.set.activeUI(ui);
		},
		[kernel]
	);
};

/**
 * Async command: persist current or given consents. Returns the kernel's
 * own save() method so identity is stable across renders.
 */
export const useSaveConsents =
	function useSaveConsents(): ConsentKernel['commands']['save'] {
		const kernel = useKernel();
		return kernel.commands.save;
	};

/**
 * Subscribe to consent changes. The callback receives the full consent record
 * whenever the kernel emits a snapshot.
 */
export const useSubscribeToConsentChanges =
	function useSubscribeToConsentChanges(): (
		listener: (state: ConsentState) => void
	) => () => void {
		const kernel = useKernel();
		return useCallback(
			(listener: (state: ConsentState) => void) =>
				kernel.events.on('permissions:changed', ({ snapshot }) =>
					listener(snapshot.effectivePermissions)
				),
			[kernel]
		);
	};

/**
 * Async command: identify a user.
 */
export const useIdentify =
	function useIdentify(): ConsentKernel['commands']['identify'] {
		const kernel = useKernel();
		return kernel.commands.identify;
	};

/**
 * Async command: run the init transport (currently a no-op in the kernel;
 * boot modules wire in SSR hydration, prefetch, banner fetch).
 */
export const useInit = function useInit(): ConsentKernel['commands']['init'] {
	const kernel = useKernel();
	return kernel.commands.init;
};

/** Read explicitChoice from the kernel without a competing projection. */
export const useExplicitChoice =
	function useExplicitChoice(): ConsentSnapshot['explicitChoice'] {
		return useKernelSelector((snapshot) => snapshot.explicitChoice);
	};

/** Read effectivePermissions from the kernel without a competing projection. */
export const useEffectivePermissions =
	function useEffectivePermissions(): ConsentSnapshot['effectivePermissions'] {
		return useKernelSelector((snapshot) => snapshot.effectivePermissions);
	};

/** Read promptRequirement from the kernel without a competing projection. */
export const usePromptRequirement =
	function usePromptRequirement(): ConsentSnapshot['promptRequirement'] {
		return useKernelSelector((snapshot) => snapshot.promptRequirement);
	};

/** Read noticeDismissal from the kernel without a competing projection. */
export const useNoticeDismissal =
	function useNoticeDismissal(): ConsentSnapshot['noticeDismissal'] {
		return useKernelSelector((snapshot) => snapshot.noticeDismissal);
	};

/** Read privacySignals from the kernel without a competing projection. */
export const usePrivacySignals =
	function usePrivacySignals(): ConsentSnapshot['privacySignals'] {
		return useKernelSelector((snapshot) => snapshot.privacySignals);
	};

/** Read optOutDirectives from the kernel without a competing projection. */
export const useOptOutDirectives =
	function useOptOutDirectives(): ConsentSnapshot['optOutDirectives'] {
		return useKernelSelector((snapshot) => snapshot.optOutDirectives);
	};

/** Read resolution from the kernel without a competing projection. */
export const usePolicyResolution =
	function usePolicyResolution(): ConsentSnapshot['resolution'] {
		return useKernelSelector((snapshot) => snapshot.resolution);
	};

/** Read policyRule from the kernel without a competing projection. */
export const usePolicyRule =
	function usePolicyRule(): ConsentSnapshot['policyRule'] {
		return useKernelSelector((snapshot) => snapshot.policyRule);
	};

/** Read restrictions from the kernel without a competing projection. */
export const useRestrictions =
	function useRestrictions(): ConsentSnapshot['restrictions'] {
		return useKernelSelector((snapshot) => snapshot.restrictions);
	};

/** Dismiss the current local notice without recording a category choice. */
export const useDismissNotice =
	function useDismissNotice(): ConsentKernel['commands']['dismissNotice'] {
		return useKernel().commands.dismissNotice;
	};

const EMPTY_PROMPT: PromptPresentation = {};
const EMPTY_PREFERENCES: PreferencesPresentation = {};
/** Host first-layer presentation. */
export const usePromptPresentation =
	function usePromptPresentation(): PromptPresentation {
		return useUIConfig().presentation?.prompt ?? EMPTY_PROMPT;
	};
/** Host persistent preferences presentation. */
export const usePreferencesPresentation =
	function usePreferencesPresentation(): PreferencesPresentation {
		return useUIConfig().presentation?.preferences ?? EMPTY_PREFERENCES;
	};
