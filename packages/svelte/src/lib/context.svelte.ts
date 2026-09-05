import {
	allConsentNames,
	consentTypes as defaultConsentTypes,
	defaultTranslationConfig,
	has as evaluateHas,
	resolveConsentPresentation,
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
	readonly isStale: boolean;
	set: (name: AllConsentNames, value: boolean) => void;
	reset: () => void;
	save: () => Promise<void>;
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
> {
	activeUI: ActiveUI;
	branding: NonNullable<ConsentSnapshot['branding']>;

	selectedConsents: Partial<ConsentState>;
	selectedConsentTypes: Partial<ConsentState>;
	presentation?: ConsentPresentation;
	readonly draft: ConsentDraftState;
	consentCategories: AllConsentNames[];
	consentTypes: ConsentType[];
	iab: SvelteIABState | null;
	manager: null;
	model: Model;
	legalLinks: ConsentManagerOptions['legalLinks'];
	translationConfig: TranslationConfig;
	getDisplayedConsents: () => ConsentType[];
	has: (condition: HasCondition<AllConsentNames>) => boolean;
	dismissNotice: () => Promise<unknown>;
	saveConsents: (type: SaveType) => Promise<void>;
	setActiveUI: (ui: ActiveUI, options?: { force?: boolean }) => void;
	setConsent: (name: AllConsentNames, value: boolean) => void;
	setLanguage: (code: string) => void;
	setSelectedConsent: (name: AllConsentNames, value: boolean) => void;
	subscribeToConsentChanges: (
		listener: (state: ConsentState) => void
	) => () => void;
}

export interface ConsentContextValue {
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
			return [
				'necessary',
				...getSnapshotLocal().policyRule.scope.filter(
					(name) => configured.length === 0 || configured.includes(name)
				),
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
			if (type === 'all') {
				await kernel.commands.save('all');
				options.getDraft().reset();
				return;
			}
			if (type === 'necessary') {
				await kernel.commands.save('none');
				options.getDraft().reset();
				return;
			}
			await options.getDraft().save();
		},
		get selectedConsents() {
			return options.getDraft().values;
		},
		get selectedConsentTypes() {
			return options.getDraft().values;
		},
		setActiveUI(ui: ActiveUI) {
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
			scrollLock: false,
			trapFocus: true,
		}
	);
};
