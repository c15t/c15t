import {
	allConsentNames,
	consentTypes as defaultConsentTypes,
	defaultTranslationConfig,
	has as evaluateHas,
} from '@c15t/core';
import type {
	ActiveUI,
	AllConsentNames,
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	ConsentType,
	HasCondition,
	KernelActiveUI,
	KernelIABState,
	Model,
	PolicyUiSurfaceConfig,
	TranslationConfig,
} from '@c15t/core';
import type { Theme, UIOptions } from '@c15t/ui/theme';
import { getContext, setContext } from 'svelte';

import type { ConsentManagerOptions } from './types';

const CONSENT_CONTEXT_KEY = Symbol('c15t-v3-consent');
const THEME_CONTEXT_KEY = Symbol('c15t-v3-theme');

const EMPTY_POLICY_SURFACE: PolicyUiSurfaceConfig = {};

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
	set: (name: AllConsentNames, value: boolean) => void;
	reset: () => void;
	save: () => Promise<void>;
}

export interface ConsentCompatState extends Omit<
	ConsentSnapshot,
	| 'activeUI'
	| 'branding'
	| 'hasConsented'
	| 'model'
	| 'policyBanner'
	| 'policyDialog'
> {
	activeUI: ActiveUI;
	branding: NonNullable<ConsentSnapshot['branding']>;
	consents: Readonly<ConsentState>;
	selectedConsents: Partial<ConsentState>;
	selectedConsentTypes: Partial<ConsentState>;
	consentInfo: { type: 'v3' } | null;
	consentCategories: AllConsentNames[];
	consentTypes: ConsentType[];
	iab: SvelteIABState | null;
	manager: null;
	model: Model;
	policyBanner: PolicyUiSurfaceConfig;
	policyDialog: PolicyUiSurfaceConfig;
	legalLinks: ConsentManagerOptions['legalLinks'];
	translationConfig: TranslationConfig;
	getDisplayedConsents: () => ConsentType[];
	has: (condition: HasCondition<AllConsentNames>) => boolean;
	hasConsented: () => boolean;
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
	readonly state: ConsentCompatState;
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

const toModel = function toModel(model: ConsentSnapshot['model']): Model {
	return (model ?? 'opt-in') as Model;
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

const createCompatState = function createCompatState(
	kernel: ConsentKernel,
	options: ConsentControllerOptions
): ConsentCompatState {
	const getSnapshotLocal = options.getSnapshot;

	// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
	const controller: ConsentCompatState = {
		get activeUI() {
			return toActiveUI(getSnapshotLocal().activeUI);
		},
		get branding() {
			return getSnapshotLocal().branding ?? 'c15t';
		},
		get consentCategories() {
			const configured = options.getConsentCategories();
			return configured.length > 0
				? configured
				: Array.from(
						getSnapshotLocal().policyCategories.length > 0
							? getSnapshotLocal().policyCategories
							: allConsentNames
					);
		},
		get consentInfo() {
			return getSnapshotLocal().hasConsented ? { type: 'v3' as const } : null;
		},
		// -- Controller-owned state (computed from snapshot + provider options) --
		get consents() {
			return getSnapshotLocal().consents;
		},
		get consentTypes() {
			return displayedConsentTypes(controller.consentCategories);
		},

		// -- Methods --------------------------------------------------------------
		getDisplayedConsents() {
			return displayedConsentTypes(controller.consentCategories);
		},
		has(condition: HasCondition<AllConsentNames>) {
			const snapshot = getSnapshotLocal();
			const categories = Array.from(
				snapshot.policyCategories
			) as AllConsentNames[];
			return evaluateHas(condition, snapshot.consents as ConsentState, {
				policyCategories: categories.length > 0 ? categories : null,
				policyScopeMode: snapshot.policyScopeMode,
			});
		},
		hasConsented() {
			return getSnapshotLocal().hasConsented;
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
			return toModel(getSnapshotLocal().model);
		},

		// -- Snapshot passthrough (was previously served by a Proxy) -------------
		get overrides() {
			return getSnapshotLocal().overrides;
		},
		get policy() {
			return getSnapshotLocal().policy;
		},
		get policyBanner() {
			return getSnapshotLocal().policyBanner ?? EMPTY_POLICY_SURFACE;
		},
		get policyCategories() {
			return getSnapshotLocal().policyCategories;
		},
		get policyDecision() {
			return getSnapshotLocal().policyDecision;
		},
		get policyDialog() {
			return getSnapshotLocal().policyDialog ?? EMPTY_POLICY_SURFACE;
		},
		get policyProvisional() {
			return getSnapshotLocal().policyProvisional;
		},
		get policyScopeMode() {
			return getSnapshotLocal().policyScopeMode;
		},
		get policySnapshotToken() {
			return getSnapshotLocal().policySnapshotToken;
		},
		get revision() {
			return getSnapshotLocal().revision;
		},
		async saveConsents(type: SaveType) {
			if (type === 'all') {
				await kernel.commands.save('all', {
					categories: controller.consentCategories,
				});
				options.getDraft().reset();
				return;
			}
			if (type === 'necessary') {
				await kernel.commands.save('none', {
					categories: controller.consentCategories,
				});
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
			kernel.set.consent({ [name]: value } as Partial<ConsentState>);
		},
		setLanguage(code: string) {
			kernel.set.language(code);
			void kernel.commands.init();
		},
		setSelectedConsent(name: AllConsentNames, value: boolean) {
			options.getDraft().set(name, value);
		},
		get subjectId() {
			return getSnapshotLocal().subjectId;
		},
		subscribeToConsentChanges(listener: (state: ConsentState) => void) {
			return kernel.subscribe((snapshot: ConsentSnapshot) =>
				listener(snapshot.consents as ConsentState)
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
	const compatState = createCompatState(kernel, options);
	setContext(CONSENT_CONTEXT_KEY, {
		kernel,
		get manager() {
			return kernel;
		},
		get snapshot() {
			return options.getSnapshot();
		},
		get state() {
			return compatState;
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
	function getConsentManager(): ConsentCompatState {
		return getConsentContext().state;
	};

export interface HeadlessConsentSurfaceState {
	allowedActions: string[];
	orderedActions: string[];
	actionGroups: string[][];
	primaryActions: string[];
	layout?: unknown[];
	direction: 'row' | 'column';
	uiProfile?: string;
	scrollLock?: boolean;
	hasPolicyHints: boolean;
	shouldFillActions: boolean;
	isVisible: boolean;
}

const resolveHeadlessSurface = function resolveHeadlessSurface(
	consent: ConsentCompatState,
	surface: 'banner' | 'dialog',
	policy: PolicyUiSurfaceConfig
): HeadlessConsentSurfaceState {
	const allowedActions = (policy.allowedActions ?? [
		'reject',
		'accept',
		'customize',
	]) as string[];
	const layout = policy.layout as unknown[] | undefined;
	const orderedActions =
		layout?.flatMap((group) => (Array.isArray(group) ? group : [group])) ??
		allowedActions;
	const actionGroups = layout?.map((group) =>
		Array.isArray(group) ? group : [group]
	) ?? [allowedActions];
	const direction = policy.direction === 'column' ? 'column' : 'row';
	const primaryActions = (policy.primaryActions as string[] | undefined) ?? [
		'customize',
	];
	return {
		actionGroups: actionGroups as string[][],
		allowedActions,
		direction,
		hasPolicyHints: Object.keys(policy).length > 0,
		isVisible: consent.activeUI === surface,
		layout,
		orderedActions: orderedActions as string[],
		primaryActions,
		scrollLock: policy.scrollLock,
		shouldFillActions: direction === 'column' && actionGroups.length > 1,
		uiProfile: policy.uiProfile as string | undefined,
	};
};

export const getHeadlessConsent = function getHeadlessConsent() {
	const consent = getConsentManager();
	return {
		get activeUI() {
			return consent.activeUI;
		},
		get banner() {
			return resolveHeadlessSurface(consent, 'banner', consent.policyBanner);
		},
		closeUI() {
			consent.setActiveUI('none');
		},
		get dialog() {
			return resolveHeadlessSurface(consent, 'dialog', consent.policyDialog);
		},
		openBanner() {
			consent.setActiveUI('banner');
		},
		openDialog() {
			consent.setActiveUI('dialog');
		},
		async performAction(action: 'accept' | 'reject' | 'customize') {
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
