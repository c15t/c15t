import {
	allConsentNames,
	consentTypes as defaultConsentTypes,
	defaultTranslationConfig,
	has as evaluateHas,
	resolveConsentPresentation,
	vendorsListedUnder,
} from '@c15t/core';
import type {
	ActiveUI,
	AllConsentNames,
	ConsentKernel,
	ConsentPresentation,
	ResolvedConsentPresentation,
	ConsentSnapshot,
	ConsentState,
	ConsentType,
	HasCondition,
	KernelActiveUI,
	KernelIABState,
	Model,
	ResolvedVendor,
	TranslationConfig,
} from '@c15t/core';
import type { Theme, UIOptions } from '@c15t/ui/theme';
import { getContext, setContext } from 'svelte';

import type { ConsentManagerOptions } from './types';

const CONSENT_CONTEXT_KEY = Symbol('c15t-v3-consent');
const THEME_CONTEXT_KEY = Symbol('c15t-v3-theme');

export type SaveType = 'all' | 'custom' | 'necessary';

export interface SvelteIABState extends KernelIABState {
	config: {
		enabled: boolean;
		cmpId: number | null;
	};
	isLoadingGVL: boolean;
	nonIABVendors: KernelIABState['customVendors'];
	preferenceCenterTab: 'purposes' | 'vendors';
	setPreferenceCenterTab: (tab: 'purposes' | 'vendors') => void;
	setVendorConsent: (vendorId: string | number, value: boolean) => void;
	setVendorLegitimateInterest: (
		vendorId: string | number,
		value: boolean
	) => void;
	setPurposeConsent: (purposeId: number, value: boolean) => void;
	setPurposeLegitimateInterest: (purposeId: number, value: boolean) => void;
	setSpecialFeatureOptIn: (featureId: number, value: boolean) => void;
	acceptAll: () => void;
	rejectAll: () => void;
	save: () => Promise<void>;
}

export interface ConsentDraftState {
	readonly values: Partial<ConsentState>;
	/**
	 * Granted flag per declared vendor. Seeded from the denials the gate
	 * honors, so a vendor declared `disabled` reads `true` whatever an older
	 * record says; every vendor not denied is `true`. Empty under an `iab`
	 * policy.
	 */
	readonly vendors: Readonly<Record<string, boolean>>;
	readonly isStale: boolean;
	set: (name: AllConsentNames, value: boolean) => void;
	/**
	 * Stage one vendor's grant. Recorded by the next save. Ignored for a
	 * vendor that is not declared or is declared `disabled`, since the kernel
	 * would drop the grant on save.
	 *
	 * @param vendorId - Vendor slug as declared in `vendors` or on a script.
	 * @param granted - Whether the vendor may load once the draft is saved.
	 */
	setVendor: (vendorId: string, granted: boolean) => void;
	reset: () => void;
	save: (categories: readonly AllConsentNames[]) => Promise<void>;
}

export interface ConsentManagerState extends Pick<
	ConsentSnapshot,
	| 'explicitChoice'
	| 'effectivePermissions'
	| 'promptRequirement'
	| 'noticeDismissal'
	| 'privacySignals'
	| 'optOutDirectives'
	| 'resolution'
	| 'policyRule'
	| 'restrictions'
	| 'nextDeadline'
	| 'subject'
	| 'evaluatedAt'
	| 'evaluationPolicy'
	| 'policyPending'
	| 'location'
	| 'overrides'
	| 'revision'
	| 'translations'
	| 'user'
	| 'vendors'
	| 'vendorChoice'
> {
	activeUI: ActiveUI;
	branding: NonNullable<ConsentSnapshot['branding']>;

	selectedConsents: Partial<ConsentState>;
	selectedConsentTypes: Partial<ConsentState>;
	/** Granted flag per declared vendor in the draft. */
	selectedVendors: Readonly<Record<string, boolean>>;
	presentation?: ConsentPresentation;
	readonly draft: ConsentDraftState;
	consentCategories: AllConsentNames[];
	consentTypes: ConsentType[];
	iab: SvelteIABState | null;
	manager: null;
	model: Model;
	/**
	 * Whether a policy rule is resolved for this visitor. Every c15t consent
	 * surface renders nothing until one is: an unconfigured, failed, or
	 * unmatched resolution leaves nothing to consent to, and the surfaces
	 * appear on their own once a later init supplies a rule.
	 */
	hasPolicy: boolean;
	/**
	 * Whether the resolved rule owes any consent UI. A prompt owes a banner
	 * and a preference center; rights owe a way back to preferences. A `none`
	 * rule with no rights owes neither, so every surface stays hidden while
	 * the permissions it grants apply. `false` until a rule is resolved.
	 */
	hasConsentUi: boolean;
	legalLinks: ConsentManagerOptions['legalLinks'];
	translationConfig: TranslationConfig;
	getDisplayedConsents: () => ConsentType[];
	/**
	 * The vendors listed under one category: presentable, naming that
	 * category, without a negation. Empty under an `iab` policy, where the
	 * TC string decides and vendor rows are not shown.
	 *
	 * @param category - The category row being rendered.
	 * @returns The vendors to list, in declared order.
	 */
	getDisplayedVendors: (category: AllConsentNames) => ResolvedVendor[];
	has: (condition: HasCondition<AllConsentNames>) => boolean;
	dismissNotice: () => Promise<unknown>;
	saveConsents: (type: SaveType) => Promise<void>;
	setActiveUI: (ui: ActiveUI, options?: { force?: boolean }) => void;
	setConsent: (name: AllConsentNames, value: boolean) => void;
	setLanguage: (code: string) => void;
	setSelectedConsent: (name: AllConsentNames, value: boolean) => void;
	/**
	 * Stage one vendor's grant on the draft. Recorded by the next save.
	 *
	 * @param vendorId - Vendor slug as declared in `vendors` or on a script.
	 * @param granted - Whether the vendor may load once the draft is saved.
	 */
	setSelectedVendor: (vendorId: string, granted: boolean) => void;
	subscribeToConsentChanges: (
		listener: (state: ConsentState) => void
	) => () => void;
}

export interface ConsentContextValue {
	readonly clearRecords: () => void;
	readonly kernel: ConsentKernel;
	readonly snapshot: ConsentSnapshot;
	readonly state: ConsentManagerState;
	readonly manager: ConsentKernel;
}

export interface ThemeContextValue {
	readonly theme?: Theme;
	readonly noStyle?: boolean;
	readonly disableAnimation?: boolean;
	readonly scrollLock?: boolean;
	readonly trapFocus?: boolean;
	readonly colorScheme?: UIOptions['colorScheme'];
	readonly legalLinks?: ConsentManagerOptions['legalLinks'];
}

export interface ConsentControllerOptions {
	clearRecords?: () => void;
	getSnapshot: () => ConsentSnapshot;
	getDraft: () => ConsentDraftState;
	getIAB: () => SvelteIABState | null;
	getConsentCategories: () => AllConsentNames[];
	getLegalLinks: () => ConsentManagerOptions['legalLinks'];
	getPresentation: () => ConsentPresentation | undefined;
}

const toTranslationConfig = function toTranslationConfig(
	snapshot: ConsentSnapshot
): TranslationConfig {
	const resolved = snapshot.translations;
	if (!resolved) {
		return defaultTranslationConfig;
	}

	return {
		...defaultTranslationConfig,
		defaultLanguage: resolved.language,
		translations: {
			...defaultTranslationConfig.translations,
			[resolved.language]: resolved.translations,
		},
	};
};

const toActiveUI = function toActiveUI(ui: KernelActiveUI): ActiveUI {
	return (ui ?? 'none') as ActiveUI;
};

const displayedConsentTypes = function displayedConsentTypes(
	categories: readonly AllConsentNames[]
) {
	const allowed =
		categories.length > 0
			? new Set(categories)
			: new Set(allConsentNames as readonly AllConsentNames[]);
	return defaultConsentTypes
		.filter((type) => allowed.has(type.name))
		.map((type) => ({ ...type, display: true }));
};

const createConsentState = function createConsentState(
	kernel: ConsentKernel,
	options: ConsentControllerOptions
): ConsentManagerState {
	const getSnapshotLocal = options.getSnapshot;
	let actionSequence = 0;

	// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
	const controller: ConsentManagerState = {
		get activeUI() {
			return toActiveUI(getSnapshotLocal().activeUI);
		},
		get branding() {
			return getSnapshotLocal().branding ?? 'c15t';
		},
		get consentCategories(): AllConsentNames[] {
			const configured = options.getConsentCategories();
			const { scope } = getSnapshotLocal().policyRule;
			return [
				...new Set<AllConsentNames>([
					'necessary',
					...(configured.length === 0
						? scope
						: configured.filter((name) =>
								scope.some((category) => category === name)
							)),
				]),
			];
		},
		get draft() {
			return options.getDraft();
		},
		get presentation() {
			return options.getPresentation();
		},
		// -- Controller-owned state (computed from snapshot + provider options) --

		get consentTypes() {
			return displayedConsentTypes(controller.consentCategories);
		},

		// -- Methods --------------------------------------------------------------
		getDisplayedConsents() {
			return displayedConsentTypes(controller.consentCategories);
		},
		getDisplayedVendors(category: AllConsentNames) {
			const snapshot = getSnapshotLocal();
			return snapshot.model === 'iab'
				? []
				: vendorsListedUnder(snapshot.vendors?.declared ?? [], category);
		},
		has(condition: HasCondition<AllConsentNames>) {
			const snapshot = getSnapshotLocal();
			return evaluateHas(
				condition,
				snapshot.effectivePermissions as ConsentState
			);
		},
		dismissNotice() {
			return kernel.commands.dismissNotice();
		},
		get iab() {
			return options.getIAB();
		},
		get legalLinks() {
			return options.getLegalLinks();
		},
		get location() {
			return getSnapshotLocal().location;
		},
		get manager() {
			return null;
		},
		get model() {
			return getSnapshotLocal().iab?.enabled
				? 'iab'
				: getSnapshotLocal().policyRule.model;
		},
		get hasPolicy() {
			return getSnapshotLocal().resolution.status === 'matched';
		},
		get hasConsentUi() {
			const snapshot = getSnapshotLocal();
			return (
				snapshot.resolution.status === 'matched' &&
				(snapshot.policyRule.prompt !== 'none' ||
					snapshot.policyRule.rights.length > 0)
			);
		},

		// -- Snapshot passthrough (was previously served by a Proxy) -------------
		get explicitChoice() {
			return getSnapshotLocal().explicitChoice;
		},
		get effectivePermissions() {
			return getSnapshotLocal().effectivePermissions;
		},
		get promptRequirement() {
			return getSnapshotLocal().promptRequirement;
		},
		get noticeDismissal() {
			return getSnapshotLocal().noticeDismissal;
		},
		get privacySignals() {
			return getSnapshotLocal().privacySignals;
		},
		get optOutDirectives() {
			return getSnapshotLocal().optOutDirectives;
		},
		get resolution() {
			return getSnapshotLocal().resolution;
		},
		get policyRule() {
			return getSnapshotLocal().policyRule;
		},
		get restrictions() {
			return getSnapshotLocal().restrictions;
		},
		get nextDeadline() {
			return getSnapshotLocal().nextDeadline;
		},
		get subject() {
			return getSnapshotLocal().subject;
		},
		get evaluatedAt() {
			return getSnapshotLocal().evaluatedAt;
		},
		get evaluationPolicy() {
			return getSnapshotLocal().evaluationPolicy;
		},
		get overrides() {
			return getSnapshotLocal().overrides;
		},

		get policyPending() {
			return getSnapshotLocal().policyPending;
		},

		get revision() {
			return getSnapshotLocal().revision;
		},
		async saveConsents(type: SaveType) {
			actionSequence += 1;
			const sequence = actionSequence;
			const before = kernel.getSnapshot();
			const fromDialog = before.activeUI === 'dialog';
			const recorded = () => {
				const after = kernel.getSnapshot();
				return (
					after.explicitChoice !== before.explicitChoice ||
					after.vendorChoice !== before.vendorChoice
				);
			};
			const closeDialog = () => {
				const current = kernel.getSnapshot();
				kernel.set.activeUI(
					current.policyPending ||
						current.resolution.status === 'failed' ||
						current.promptRequirement.kind === 'none'
						? 'none'
						: 'banner'
				);
			};
			const save = async () => {
				if (type === 'custom') {
					await options.getDraft().save(controller.consentCategories);
					return;
				}
				const pendingSave = kernel.commands.save(
					type === 'all' ? 'all' : 'none',
					{
						categories: controller.consentCategories,
					}
				);
				// The record already holds the choice; the draft follows it now.
				if (recorded()) {
					options.getDraft().reset();
				}
				const result = await pendingSave;
				if (!result.ok) {
					throw new Error('Unable to save preferences.');
				}
				if (sequence === actionSequence) {
					options.getDraft().reset();
				}
			};
			// The kernel records the choice and updates permissions before the
			// transport runs (storage follows one task later, still ahead of
			// the request). Close in this task and let
			// the backend request finish in the background: its outcome never
			// reopens the dialog, and a failed request stays queued for replay.
			const pending = save();
			const closed = fromDialog && recorded();
			if (closed && sequence === actionSequence) {
				closeDialog();
			}
			await pending;
			// A save that recorded nothing new closes once it resolves.
			if (
				fromDialog &&
				!closed &&
				sequence === actionSequence &&
				kernel.getSnapshot().activeUI === 'dialog'
			) {
				closeDialog();
			}
		},
		get selectedConsents() {
			return options.getDraft().values;
		},
		get selectedConsentTypes() {
			return options.getDraft().values;
		},
		get selectedVendors() {
			return options.getDraft().vendors;
		},
		setActiveUI(ui: ActiveUI) {
			actionSequence += 1;
			(
				kernel.set as typeof kernel.set & {
					activeUI: (ui: KernelActiveUI) => void;
				}
			).activeUI(ui as KernelActiveUI);
		},
		setConsent(name: AllConsentNames, value: boolean) {
			options.getDraft().set(name, value);
		},
		setLanguage(code: string) {
			kernel.set.language(code);
			void kernel.commands.init();
		},
		setSelectedConsent(name: AllConsentNames, value: boolean) {
			options.getDraft().set(name, value);
		},
		setSelectedVendor(vendorId: string, granted: boolean) {
			options.getDraft().setVendor(vendorId, granted);
		},

		subscribeToConsentChanges(listener: (state: ConsentState) => void) {
			return kernel.subscribe((snapshot: ConsentSnapshot) =>
				listener(snapshot.effectivePermissions as ConsentState)
			);
		},

		get translationConfig() {
			return toTranslationConfig(getSnapshotLocal());
		},
		get translations() {
			return getSnapshotLocal().translations;
		},
		get vendorChoice() {
			return getSnapshotLocal().vendorChoice;
		},
		get vendors() {
			return getSnapshotLocal().vendors;
		},
		get user() {
			return getSnapshotLocal().user;
		},
	};

	return controller;
};

export const setConsentContext = function setConsentContext(
	kernel: ConsentKernel,
	options: ConsentControllerOptions
): void {
	const consentState = createConsentState(kernel, options);
	setContext(CONSENT_CONTEXT_KEY, {
		clearRecords: () => {
			if (options.clearRecords) {
				options.clearRecords();
			} else {
				kernel.hydrate({
					choice: null,
					noticeDismissal: null,
					optOutDirectives: [],
					subject: null,
				});
				kernel.events.emit({ type: 'records:cleared' });
			}
		},
		kernel,
		get manager() {
			return kernel;
		},
		get snapshot() {
			return options.getSnapshot();
		},
		get state() {
			return consentState;
		},
	} satisfies ConsentContextValue);
};

export const getConsentContext =
	function getConsentContext(): ConsentContextValue {
		const context = getContext<ConsentContextValue | undefined>(
			CONSENT_CONTEXT_KEY
		);
		if (!context) {
			throw new Error(
				'c15t: no v3 consent context. Wrap your app with <ConsentManagerProvider options={...}> from @c15t/svelte.'
			);
		}
		return context;
	};

export const getConsentKernel = function getConsentKernel(): ConsentKernel {
	return getConsentContext().kernel;
};

export const getSnapshot = function getSnapshot(): ConsentSnapshot {
	return getConsentContext().snapshot;
};

/**
 * Returns the reactive consent manager controller for the current component.
 *
 * Exposes both readable state (`consents`, `activeUI`, `model`, …) and
 * mutators (`setConsent`, `saveConsents`, `setActiveUI`, `setLanguage`, …).
 * This is the primary API for reading and writing consent from inside your
 * own components — equivalent to React's `useConsentManager()`.
 *
 * Must be called inside a component tree wrapped in `<ConsentManagerProvider>`.
 */
export const getConsentManager =
	function getConsentManager(): ConsentManagerState {
		return getConsentContext().state;
	};

export interface HeadlessConsentSurfaceState extends ResolvedConsentPresentation {
	isVisible: boolean;
}
const resolveHeadlessSurface = (
	consent: ConsentManagerState,
	surface: 'banner' | 'dialog'
): HeadlessConsentSurfaceState => ({
	...resolveConsentPresentation({
		policy: consent.policyRule,
		presentation: consent.presentation,
		surface: surface === 'banner' ? 'prompt' : 'preferences',
	}),
	isVisible: consent.activeUI === surface,
});

export const getHeadlessConsent = function getHeadlessConsent() {
	const consent = getConsentManager();
	return {
		get activeUI() {
			return consent.activeUI;
		},
		get banner() {
			return resolveHeadlessSurface(consent, 'banner');
		},
		closeUI() {
			consent.setActiveUI('none');
		},
		get dialog() {
			return resolveHeadlessSurface(consent, 'dialog');
		},
		openBanner() {
			consent.setActiveUI('banner');
		},
		openDialog() {
			consent.setActiveUI('dialog');
		},
		async performAction(
			action: 'accept' | 'reject' | 'customize' | 'dismiss' | 'save'
		) {
			if (action === 'dismiss') {
				await consent.dismissNotice();
				return;
			}
			if (action === 'save') {
				await consent.saveConsents('custom');
				return;
			}
			if (action === 'accept') {
				await consent.saveConsents('all');
				return;
			}
			if (action === 'reject') {
				await consent.saveConsents('necessary');
				return;
			}
			consent.setActiveUI('dialog');
		},
		async saveCustomPreferences() {
			await consent.saveConsents('custom');
		},
	};
};

/**
 * Close an IAB surface in the task that handled the click, then save.
 *
 * An IAB choice commits once its TC string is encoded, which can wait on the
 * TCF library chunk but never on the backend. The surface comes back only
 * when that local step recorded nothing (the vendor list failed to load, or
 * the policy changed underneath), so the visitor can try again. A failed
 * backend request never reopens it.
 *
 * @internal
 */
export const saveIABChoice = async function saveIABChoice(
	kernel: ConsentKernel,
	save: () => Promise<void>
): Promise<void> {
	const before = kernel.getSnapshot();
	const surface = before.activeUI;
	if (surface !== 'none') {
		kernel.set.activeUI('none');
	}
	try {
		await save();
	} finally {
		const after = kernel.getSnapshot();
		if (
			surface !== 'none' &&
			after.iab?.authority === before.iab?.authority &&
			after.activeUI === 'none'
		) {
			kernel.set.activeUI(surface);
		}
	}
};

export const getIAB = function getIAB(): SvelteIABState | null {
	return getConsentContext().state.iab;
};

export const setThemeContext = function setThemeContext(
	value: ThemeContextValue
): void {
	setContext(THEME_CONTEXT_KEY, value);
};

export const getThemeContext = function getThemeContext(): ThemeContextValue {
	return (
		getContext<ThemeContextValue | undefined>(THEME_CONTEXT_KEY) ?? {
			colorScheme: 'system',
			disableAnimation: false,
			noStyle: false,
			scrollLock: undefined,
			trapFocus: undefined,
		}
	);
};
