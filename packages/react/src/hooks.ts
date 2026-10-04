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
	ConsentPresentation,
	ExperimentAssignment,
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
	ResolvedVendor,
	VendorChoice,
} from '@c15t/core';
import {
	applyExperimentAssignment,
	applyExperimentTheme,
	isVendorAllowed,
} from '@c15t/core';
import {
	hasConsentPreferences,
	hasConsentUI,
	showConsentSurface,
} from '@c15t/core/surface-actions';
import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

import { ProviderServicesContext } from './context';
import {
	useGateSelector,
	useKernel,
	useKernelSelector,
} from './kernel-selector';
import type { Theme } from './types/theme';
import { useUIConfig } from './ui-config-context';

/**
 * Full snapshot accessor. Escape hatch for consumers that genuinely need
 * multiple slices. Prefer narrow hooks for re-render isolation.
 */
export const useSnapshot = function useSnapshot(): ConsentSnapshot {
	const kernel = useKernel();
	return useSyncExternalStore(
		(listener) => kernel.subscribe(listener),
		() => kernel.getSnapshot(),
		() => kernel.getServerSnapshot()
	);
};

/**
 * Effective permission for one category. This can be true under an opt-out
 * policy without an explicit grant. Re-renders only when that permission changes.
 */
export const useConsent = function useConsent(
	category: AllConsentNames
): boolean {
	return useKernelSelector((snap) => snap.effectivePermissions[category]);
};

/**
 * Effective permissions for all categories. Use `useExplicitChoice` for recorded
 * choices. Re-renders when permissions change.
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

/**
 * Whether the kernel holds a resolved policy rule.
 *
 * `false` while resolution is unconfigured, failed, or matched nothing, and
 * while a pending init has not answered yet. Without a policy there is
 * nothing to consent to, so every prebuilt consent surface renders nothing;
 * headless hosts should do the same.
 */
export const useHasConsentPolicy = function useHasConsentPolicy(): boolean {
	return useKernelSelector((snap) => snap.resolution.status === 'matched');
};

/**
 * Whether any prebuilt consent surface has something to show: a policy rule
 * is resolved and it either owes a first-layer prompt or keeps a right
 * reachable. A `none` rule without rights owes nothing, so every surface
 * renders nothing; give it `rights: ['preferences']` to keep a settings
 * route. Every other model always carries rights, so for them this equals
 * {@link useHasConsentPolicy}.
 */
export const useHasConsentUI = function useHasConsentUI(): boolean {
	return useKernelSelector(hasConsentUI);
};

/** Whether c15t or an external CMP offers a preferences control. */
export const useHasConsentPreferences =
	function useHasConsentPreferences(): boolean {
		return useKernelSelector(hasConsentPreferences);
	};

/**
 * Derived consent model (opt-in / opt-out / iab), or `null` while no policy
 * rule is resolved. The kernel keeps a safe fallback rule internally; this
 * hook hides it so hosts can key "no consent UI" on `null`.
 */
export const useModel = function useModel(): KernelModel | null {
	return useKernelSelector((snap) =>
		snap.resolution.status === 'matched' ? snap.model : null
	);
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

const NO_VENDORS: readonly ResolvedVendor[] = [];

/**
 * Vendors declared for vendor-level consent outside IAB, merged from the
 * provider's `vendors` option, the backend and script slugs. Empty under an
 * `iab` policy, where the TC string decides and vendor rows are not shown.
 */
export const useDeclaredVendors =
	function useDeclaredVendors(): readonly ResolvedVendor[] {
		return useKernelSelector((snap) =>
			snap.model === 'iab' ? NO_VENDORS : (snap.vendors?.declared ?? NO_VENDORS)
		);
	};

/**
 * The visitor's recorded vendor decision.
 *
 * @returns The decision, whose `denied` list may be empty after a bulk
 * action lifted every denial, or `null` when no vendor decision was ever
 * recorded.
 */
export const useVendorChoice =
	function useVendorChoice(): Readonly<VendorChoice> | null {
		return useKernelSelector((snap) => snap.vendorChoice);
	};

/**
 * Whether one vendor may load: it is declared, its category condition
 * passes, and outside IAB the visitor has not turned it off.
 *
 * @param vendorId - Vendor id as declared in `vendors`, on a script or by
 * the backend.
 * @returns `true` while the vendor may load. An id nothing declares, such
 * as a typo, returns `false` and logs a development warning.
 */
export const useVendorAllowed = function useVendorAllowed(
	vendorId: string
): boolean {
	return useGateSelector((snap, now) => isVendorAllowed(snap, vendorId, now));
};

/** Register categories used by scripts, frames, or other integrations. */
export const useRegisterConsentCategories =
	function useRegisterConsentCategories() {
		return useKernel().set.registerConsentCategories;
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
 * Switch the consent language and load its copy.
 *
 * Stores the language override and runs init again, so the banner and
 * dialog show copy in that language: a hosted backend returns it, and
 * offline mode takes it from the bundled translations and `i18n.messages`.
 * Setting the current language does nothing. A disabled provider stores
 * the language without running init.
 *
 * @returns A setter that takes a language code such as `'de'`.
 *
 * @example
 * ```tsx
 * const setLanguage = useSetLanguage();
 * <button onClick={() => setLanguage('de')}>Deutsch</button>
 * ```
 */
export const useSetLanguage = function useSetLanguage(): (
	code: string
) => void {
	const kernel = useKernel();
	const services = useContext(ProviderServicesContext);
	return useCallback(
		(code: string) => {
			if (services) {
				services.setLanguage(code);
				return;
			}
			if (code === kernel.getSnapshot().overrides.language) {
				return;
			}
			kernel.set.language(code);
			void kernel.commands.init();
		},
		[kernel, services]
	);
};

/**
 * Sync mutation: set the active UI surface (banner/dialog/none).
 *
 * Explicit navigation: a pending save on this kernel can no longer close or
 * restore a surface once the visitor navigated.
 */
export const useSetActiveUI = function useSetActiveUI(): (
	ui: KernelActiveUI
) => void {
	const kernel = useKernel();
	return useCallback(
		(ui: KernelActiveUI) => showConsentSurface(kernel, ui),
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

/**
 * The presentation experiment arm this visitor runs. Built-in assignment
 * lands after mount; a host-resolved `variant` is known at once.
 *
 * @returns The assignment, or `null` while no experiment is configured, the
 * arm is not assigned yet, or the visitor's policy rejects it.
 *
 * @example
 * ```tsx
 * const arm = useExperiment();
 * return arm ? <p>{arm.id}: {arm.variant}</p> : null;
 * ```
 */
export const useExperiment =
	function useExperiment(): Readonly<ExperimentAssignment> | null {
		return useKernelSelector((snapshot) => snapshot.experiment);
	};

/**
 * The host presentation with the assigned experiment arm merged over it.
 *
 * @returns The presentation to render: `options.presentation` itself while
 * no arm is assigned.
 */
export const useResolvedPresentation = function useResolvedPresentation():
	| ConsentPresentation
	| undefined {
	const { experiment, presentation } = useUIConfig();
	const assignment = useExperiment();
	return useMemo(
		() => applyExperimentAssignment(presentation, experiment, assignment),
		[presentation, experiment, assignment]
	);
};

/**
 * The host theme with the assigned experiment arm's `theme` merged over it.
 * Render its tokens with `<ConsentTheme theme={useResolvedTheme()} />`.
 *
 * @returns The theme to render: `options.theme` itself while no arm is
 * assigned or the arm has no theme.
 */
export const useResolvedTheme = function useResolvedTheme(): Theme | undefined {
	const { experiment, theme } = useUIConfig();
	const assignment = useExperiment();
	return useMemo(
		() => applyExperimentTheme(theme, experiment, assignment),
		[theme, experiment, assignment]
	);
};

const EMPTY_PROMPT: PromptPresentation = {};
const EMPTY_PREFERENCES: PreferencesPresentation = {};
/** Host first-layer presentation, with the experiment arm applied. */
export const usePromptPresentation =
	function usePromptPresentation(): PromptPresentation {
		return useResolvedPresentation()?.prompt ?? EMPTY_PROMPT;
	};
/** Host persistent preferences presentation, with the experiment arm applied. */
export const usePreferencesPresentation =
	function usePreferencesPresentation(): PreferencesPresentation {
		return useResolvedPresentation()?.preferences ?? EMPTY_PREFERENCES;
	};
