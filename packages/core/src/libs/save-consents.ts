import type { StoreApi } from 'zustand';
import type { ConsentStoreState } from '~/store/type';
import type { ConsentManagerInterface } from '../client/client-interface';
import type { ConsentInfo, ConsentState, ConsentType } from '../types';
import { generateSubjectId } from './generate-subject-id';

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
	preferences: ConsentState;
	givenAt: number;
	jurisdiction?: string;
	jurisdictionModel?: string | null;
	domain: string;
	uiSource?: string;
}

interface SaveConsentsProps {
	manager: ConsentManagerInterface;
	type: 'necessary' | 'all' | 'custom';
	get: StoreApi<ConsentStoreState>['getState'];
	set: StoreApi<ConsentStoreState>['setState'];
	options?: { uiSource?: string };
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
function shouldReloadOnConsentChange(
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
}

export async function saveConsents({
	manager,
	type,
	get,
	set,
	options,
}: SaveConsentsProps) {
	const {
		callbacks,
		selectedConsents,
		consents,
		consentTypes,
		updateScripts,
		updateIframeConsents,
		updateNetworkBlockerConsents,
		consentCategories,
		locationInfo,
		model,
		consentInfo,
		reloadOnConsentRevoked,
	} = get();

	// Store previous consents for revocation detection
	const previousConsents = { ...consents };
	const previousConsentInfo = consentInfo;

	// Always create a fresh object so the reference changes for React state
	// comparisons. Without this, selectedConsents and consents can be the same
	// reference after the first save, causing in-place mutation that Zustand
	// and React (including React Compiler) cannot detect.
	const newConsents = { ...(selectedConsents ?? consents ?? {}) };
	const givenAt = Date.now();

	if (type === 'all') {
		for (const consent of consentTypes) {
			// Only include consents that are configured in consentCategories
			if (consentCategories.includes(consent.name)) {
				newConsents[consent.name] = true;
			}
		}
	} else if (type === 'necessary') {
		for (const consent of consentTypes) {
			newConsents[consent.name] =
				consent.disabled === true ? consent.defaultValue : false;
		}
	}

	// Get or generate subjectId
	// If we have a subjectId from previous consent, reuse it
	let subjectId = consentInfo?.subjectId;
	if (!subjectId) {
		subjectId = generateSubjectId();
	}

	// Use pending externalId from store or from user prop
	const externalId = get().consentInfo?.externalId || get().user?.id;
	const identityProvider =
		get().consentInfo?.identityProvider || get().user?.identityProvider;

	// Check if we need to reload the page due to consent revocation
	const needsReload = shouldReloadOnConsentChange(
		previousConsents,
		newConsents,
		previousConsentInfo,
		reloadOnConsentRevoked,
		consentTypes
	);

	// Immediately update the UI state to close banners/dialogs
	// This makes the interface feel more responsive
	// This also persists the consent to localStorage/cookies
	set({
		consents: newConsents,
		selectedConsents: newConsents,
		activeUI: 'none' as const,
		consentInfo: {
			time: givenAt,
			subjectId,
			externalId,
			identityProvider,
		},
	});

	// If consent was revoked and reload is enabled, store pending sync and reload
	if (needsReload) {
		// Store pending sync data for API call after reload
		const pendingSync: PendingConsentSync = {
			type,
			subjectId,
			externalId,
			identityProvider,
			preferences: newConsents,
			givenAt,
			jurisdiction: locationInfo?.jurisdiction ?? undefined,
			jurisdictionModel: model,
			domain: window.location.hostname,
			uiSource: options?.uiSource ?? 'api',
		};

		try {
			localStorage.setItem(
				PENDING_CONSENT_SYNC_KEY,
				JSON.stringify(pendingSync)
			);
		} catch {
			// localStorage might be unavailable, continue with reload anyway
			// Consent is already persisted via the store's set() call
		}

		// Trigger callback before reload
		callbacks.onConsentSet?.({
			preferences: newConsents,
		});
		callbacks.onBeforeConsentRevocationReload?.({
			preferences: newConsents,
		});

		// Reload the page to ensure complete cleanup of third-party scripts
		window.location.reload();
		return;
	}

	// Yield to the next task so the UI can paint before running heavier work
	await new Promise<void>((resolve) => setTimeout(resolve, 0));

	// Run after yielding to avoid blocking the click INP
	updateIframeConsents();
	updateScripts();
	updateNetworkBlockerConsents();

	callbacks.onConsentSet?.({
		preferences: newConsents,
	});

	// Send consent to API in the background - the UI is already updated
	const consent = await manager.setConsent({
		body: {
			type: 'cookie_banner',
			domain: window.location.hostname,
			preferences: newConsents,
			subjectId,
			externalSubjectId: String(externalId),
			identityProvider,
			jurisdiction: locationInfo?.jurisdiction ?? undefined,
			jurisdictionModel: model ?? undefined,
			givenAt,
			uiSource: options?.uiSource ?? 'api',
			consentAction: type,
		},
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
}
