import { createMaterialPolicyFingerprint } from '@c15t/schema/types';
import type { StoreApi } from 'zustand';

import type { ConsentStoreState } from '~/store/type';

import type {
	ConsentManagerInterface,
	SetConsentRequestBody,
} from '../client/client-interface';
import type {
	ConsentInfo,
	ConsentState,
	ConsentType,
	OnConsentChangedPayload,
} from '../types';
import { saveConsentToStorage } from './cookie';
import { generateSubjectId } from './generate-subject-id';
import {
	applyPolicyPurposeAllowlist,
	getEffectivePolicy,
	shouldEnforcePolicyCategoryScope,
	stripDisallowedPreferenceKeys,
} from './policy';
import { sanitizeSubjectIdentifiers } from './sanitize-subject-identifiers';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const _createDeferredPromise = function _createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

const createVoidDeferredPromise = function createVoidDeferredPromise(
	run: (
		resolve: () => void,
		reject: DeferredPromise<undefined>['reject']
	) => void
): Promise<void> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<undefined>();
	run(() => deferred.resolve(undefined), deferred.reject);
	return deferred.promise;
};

/**
 * Storage key for pending consent sync after page reload.
 * When consent is revoked and page reloads, the API sync happens on the fresh page.
 */
export const PENDING_CONSENT_SYNC_KEY = 'c15t:pending-consent-sync';

/**
 * Data structure for pending consent sync stored in localStorage.
 */
export interface PendingConsentSync {
	type: 'necessary' | 'all' | 'custom';
	subjectId: string;
	externalId?: string;
	identityProvider?: string;
	preferences: Partial<ConsentState>;
	givenAt: number;
	jurisdiction?: string;
	jurisdictionModel?: string | null;
	domain: string;
	uiSource?: string;
	policySnapshotToken?: string;
}

interface SaveConsentsProps {
	manager: ConsentManagerInterface;
	type: 'necessary' | 'all' | 'custom';
	get: StoreApi<ConsentStoreState>['getState'];
	set: StoreApi<ConsentStoreState>['setState'];
	options?: { uiSource?: string };
	emitConsentChanged?: (payload: OnConsentChangedPayload) => void;
}

/**
 * Determines if a page reload is needed when consent changes.
 *
 * Reload is needed when:
 * - reloadOnConsentRevoked is enabled (default: true)
 * - User had previously granted consent (consentInfo is not null)
 * - Any non-necessary consent was revoked (went from true to false)
 *
 * Reload is NOT needed when:
 * - reloadOnConsentRevoked is disabled
 * - User is declining consent for the first time (no prior consent)
 * - User is only adding consent (no revocations)
 */
const shouldReloadOnConsentChange = function shouldReloadOnConsentChange(
	previousConsents: ConsentState,
	newConsents: ConsentState,
	previousConsentInfo: ConsentInfo | null,
	reloadOnConsentRevoked: boolean,
	consentTypes: ConsentType[]
): boolean {
	// Explicitly disabled
	if (!reloadOnConsentRevoked) {
		return false;
	}

	// No prior consent info means scripts were never loaded
	// (opt-in model, first visit - user is just declining)
	if (previousConsentInfo === null) {
		return false;
	}

	// Check if any non-disabled consent was revoked
	// (was true before, is false now)
	const disabledNames = new Set(
		consentTypes.filter((t) => t.disabled).map((t) => t.name)
	);

	const wasAnyConsentRevoked = (
		Object.entries(newConsents) as [keyof ConsentState, boolean][]
	).some(
		([key, value]) =>
			!disabledNames.has(key) &&
			previousConsents[key] === true &&
			value === false
	);

	return wasAnyConsentRevoked;
};

const haveConsentsChanged = function haveConsentsChanged(
	previousConsents: ConsentState,
	nextConsents: ConsentState,
	consentTypes: ConsentType[]
): boolean {
	return consentTypes.some(
		(consentType) =>
			previousConsents[consentType.name] !== nextConsents[consentType.name]
	);
};

const getConsentCategoryLists = function getConsentCategoryLists(
	consents: ConsentState,
	consentCategories: ConsentStoreState['consentCategories'],
	consentTypes: ConsentType[]
): Pick<OnConsentChangedPayload, 'allowedCategories' | 'deniedCategories'> {
	const activeCategories = new Set(consentCategories);
	const allowedCategories: ConsentType['name'][] = [];
	const deniedCategories: ConsentType['name'][] = [];

	for (const consentType of consentTypes) {
		if (!activeCategories.has(consentType.name)) {
			continue;
		}

		if (consents[consentType.name]) {
			allowedCategories.push(consentType.name);
		} else {
			deniedCategories.push(consentType.name);
		}
	}

	return {
		allowedCategories,
		deniedCategories,
	};
};

const applyRequestedSelection = (
	type: SaveConsentsProps['type'],
	consents: ConsentState,
	consentTypes: ConsentType[],
	consentCategories: ConsentStoreState['consentCategories']
): void => {
	if (type === 'all') {
		consentTypes.forEach((consent) => {
			if (consentCategories.includes(consent.name)) {
				consents[consent.name] = true;
			}
		});
		return;
	}
	if (type === 'necessary') {
		consentTypes.forEach((consent) => {
			consents[consent.name] =
				consent.disabled === true ? consent.defaultValue : false;
		});
	}
};

const createConsentChangedPayload = (
	didChange: boolean,
	effectiveConsents: ConsentState,
	previousConsents: ConsentState,
	nextLists: ReturnType<typeof getConsentCategoryLists>,
	previousLists: ReturnType<typeof getConsentCategoryLists>
): OnConsentChangedPayload | null => {
	if (!didChange) {
		return null;
	}
	return {
		allowedCategories: nextLists.allowedCategories,
		deniedCategories: nextLists.deniedCategories,
		preferences: effectiveConsents,
		previousAllowedCategories: previousLists.allowedCategories,
		previousDeniedCategories: previousLists.deniedCategories,
		previousPreferences: previousConsents,
	};
};

const resolveConsentSelection = (
	type: SaveConsentsProps['type'],
	state: ConsentStoreState
) => {
	const previousConsents = { ...state.consents };
	const newConsents = {
		...(state.selectedConsents ?? state.consents ?? {}),
	};
	applyRequestedSelection(
		type,
		newConsents,
		state.consentTypes,
		state.consentCategories
	);
	const effectivePolicy = getEffectivePolicy(state.lastBannerFetchData);
	const policyCategories = effectivePolicy?.consent?.categories;
	const enforceScope = shouldEnforcePolicyCategoryScope(
		policyCategories,
		effectivePolicy?.consent?.scopeMode ?? null
	);
	const effectiveConsents = enforceScope
		? applyPolicyPurposeAllowlist(newConsents, policyCategories)
		: newConsents;
	const requestPreferences = enforceScope
		? stripDisallowedPreferenceKeys(effectiveConsents, policyCategories)
		: effectiveConsents;
	const nextLists = getConsentCategoryLists(
		effectiveConsents,
		state.consentCategories,
		state.consentTypes
	);
	const previousLists = getConsentCategoryLists(
		previousConsents,
		state.consentCategories,
		state.consentTypes
	);
	return {
		consentChangedPayload: createConsentChangedPayload(
			haveConsentsChanged(
				previousConsents,
				effectiveConsents,
				state.consentTypes
			),
			effectiveConsents,
			previousConsents,
			nextLists,
			previousLists
		),
		effectiveConsents,
		previousConsents,
		requestPreferences,
	};
};

const resolveConsentIdentity = async (
	state: ConsentStoreState,
	get: SaveConsentsProps['get'],
	givenAt: number
) => {
	const materialPolicyFingerprint = state.lastBannerFetchData?.policy
		? await createMaterialPolicyFingerprint(state.lastBannerFetchData.policy)
		: undefined;
	const subjectId = state.consentInfo?.subjectId ?? generateSubjectId();
	const currentState = get();
	const storedIdentifiers = sanitizeSubjectIdentifiers({
		externalId: currentState.consentInfo?.externalId,
		identityProvider: currentState.consentInfo?.identityProvider,
	});
	const userIdentifiers = sanitizeSubjectIdentifiers({
		externalId: currentState.user?.id,
		identityProvider: currentState.user?.identityProvider,
	});
	const externalId = storedIdentifiers.externalId ?? userIdentifiers.externalId;
	const identityProvider =
		storedIdentifiers.identityProvider ?? userIdentifiers.identityProvider;
	const nextConsentInfo: ConsentInfo = {
		materialPolicyFingerprint,
		subjectId,
		time: givenAt,
	};
	if (externalId) {
		nextConsentInfo.externalId = externalId;
	}
	if (identityProvider) {
		nextConsentInfo.identityProvider = identityProvider;
	}
	return { externalId, identityProvider, nextConsentInfo, subjectId };
};

interface ConsentSubmissionData {
	effectiveConsents: ConsentState;
	externalId?: string;
	givenAt: number;
	identityProvider?: string;
	requestPreferences: Partial<ConsentState>;
	subjectId: string;
}

const handleRevocationReload = (
	state: ConsentStoreState,
	type: SaveConsentsProps['type'],
	options: SaveConsentsProps['options'],
	emitConsentChanged: SaveConsentsProps['emitConsentChanged'],
	consentChangedPayload: OnConsentChangedPayload | null,
	data: ConsentSubmissionData
): void => {
	const pendingSync: PendingConsentSync = {
		domain: window.location.hostname,
		givenAt: data.givenAt,
		jurisdiction: state.locationInfo?.jurisdiction ?? undefined,
		jurisdictionModel: state.model,
		policySnapshotToken: state.lastBannerFetchData?.policySnapshotToken,
		preferences: data.requestPreferences,
		subjectId: data.subjectId,
		type,
		uiSource: options?.uiSource ?? 'api',
	};
	if (data.externalId) {
		pendingSync.externalId = data.externalId;
	}
	if (data.identityProvider) {
		pendingSync.identityProvider = data.identityProvider;
	}
	try {
		localStorage.setItem(PENDING_CONSENT_SYNC_KEY, JSON.stringify(pendingSync));
	} catch {
		// Consent is already persisted, so reload even if localStorage is unavailable.
	}

	state.callbacks.onConsentSet?.({ preferences: data.effectiveConsents });
	if (consentChangedPayload) {
		emitConsentChanged?.(consentChangedPayload);
	}
	state.callbacks.onBeforeConsentRevocationReload?.({
		preferences: data.effectiveConsents,
	});
	window.location.reload();
};

const createConsentRequestBody = (
	state: ConsentStoreState,
	type: SaveConsentsProps['type'],
	options: SaveConsentsProps['options'],
	data: ConsentSubmissionData
): SetConsentRequestBody => {
	const body: SetConsentRequestBody = {
		consentAction: type,
		domain: typeof window === 'undefined' ? '' : window.location.hostname,
		givenAt: data.givenAt,
		jurisdiction: state.locationInfo?.jurisdiction ?? undefined,
		jurisdictionModel: state.model ?? undefined,
		policySnapshotToken: state.lastBannerFetchData?.policySnapshotToken,
		preferences: data.requestPreferences,
		subjectId: data.subjectId,
		type: 'cookie_banner',
		uiSource: options?.uiSource ?? 'api',
	};
	if (data.externalId) {
		body.externalSubjectId = data.externalId;
	}
	if (data.identityProvider) {
		body.identityProvider = data.identityProvider;
	}
	return body;
};

export const saveConsents = async function saveConsents({
	manager,
	type,
	get,
	set,
	options,
	emitConsentChanged,
}: SaveConsentsProps) {
	const state = get();
	const {
		callbacks,
		consentTypes,
		updateScripts,
		updateIframeConsents,
		updateNetworkBlockerConsents,
		consentInfo,
		reloadOnConsentRevoked,
	} = state;

	// Store previous consents for revocation detection
	const previousConsentInfo = consentInfo;

	// Always create a fresh object so the reference changes for React state
	// comparisons. Without this, selectedConsents and consents can be the same
	// reference after the first save, causing in-place mutation that Zustand
	// and React (including React Compiler) cannot detect.
	const givenAt = Date.now();
	const {
		consentChangedPayload,
		effectiveConsents,
		previousConsents,
		requestPreferences,
	} = resolveConsentSelection(type, state);
	const { externalId, identityProvider, nextConsentInfo, subjectId } =
		await resolveConsentIdentity(state, get, givenAt);

	// Check if we need to reload the page due to consent revocation
	const needsReload = shouldReloadOnConsentChange(
		previousConsents,
		effectiveConsents,
		previousConsentInfo,
		reloadOnConsentRevoked,
		consentTypes
	);
	const submissionData: ConsentSubmissionData = {
		effectiveConsents,
		externalId,
		givenAt,
		identityProvider,
		requestPreferences,
		subjectId,
	};

	// Immediately update the UI state to close banners/dialogs
	// This makes the interface feel more responsive
	// This also persists the consent to localStorage/cookies
	set({
		activeUI: 'none' as const,
		consentInfo: nextConsentInfo,
		consents: effectiveConsents,
		selectedConsents: effectiveConsents,
	});

	saveConsentToStorage(
		{
			consentInfo: nextConsentInfo,
			consents: effectiveConsents,
		},
		undefined,
		get().storageConfig
	);

	// If consent was revoked and reload is enabled, store pending sync and reload
	if (needsReload) {
		handleRevocationReload(
			state,
			type,
			options,
			emitConsentChanged,
			consentChangedPayload,
			submissionData
		);
		return;
	}

	// Yield to the next task so the UI can paint before running heavier work
	await createVoidDeferredPromise((resolve) => setTimeout(resolve, 0));

	// Run after yielding to avoid blocking the click INP
	updateIframeConsents();
	updateScripts();
	updateNetworkBlockerConsents();

	callbacks.onConsentSet?.({
		preferences: effectiveConsents,
	});
	if (consentChangedPayload) {
		emitConsentChanged?.(consentChangedPayload);
	}

	// Send consent to API in the background - the UI is already updated
	const consentBody = createConsentRequestBody(
		state,
		type,
		options,
		submissionData
	);

	const consent = await manager.setConsent({
		body: consentBody,
	});

	// Handle error case if the API request fails
	if (!consent.ok) {
		const errorMsg = consent.error?.message ?? 'Failed to save consents';
		callbacks.onError?.({
			error: errorMsg,
		});
		// Fallback console only when no handler is provided
		if (!callbacks.onError) {
			console.error(errorMsg);
		}
	}
};
