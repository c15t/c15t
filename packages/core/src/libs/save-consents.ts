import type { StoreApi } from 'zustand';
import type { PrivacyConsentState } from '~/store.type';
import type { ConsentManagerInterface } from '../client/client-interface';
import { updateGTMConsent } from './gtm';
import type { createTrackingBlocker } from './tracking-blocker';

interface SaveConsentsProps {
	manager: ConsentManagerInterface;
	type: 'necessary' | 'all' | 'custom';
	get: StoreApi<PrivacyConsentState>['getState'];
	set: StoreApi<PrivacyConsentState>['setState'];
	/**
	 * @deprecated This method is deprecated and will be removed in the next major version. Use the new script loader instead.
	 */
	trackingBlocker: ReturnType<typeof createTrackingBlocker> | null;
}

export async function saveConsents({
	manager,
	type,
	get,
	set,
	trackingBlocker,
}: SaveConsentsProps) {
	const {
		callbacks,
		selectedConsents,
		consents,
		consentTypes,
		updateScripts,
		updateIframeConsents,
		gdprTypes,
	} = get();

	const newConsents = selectedConsents ?? consents ?? {};

	if (type === 'all') {
		for (const consent of consentTypes) {
			// Only include consents that are configured in gdprTypes
			if (gdprTypes.includes(consent.name)) {
				newConsents[consent.name] = true;
			}
		}
	} else if (type === 'necessary') {
		for (const consent of consentTypes) {
			newConsents[consent.name] = consent.name === 'necessary';
		}
	}

	// Immediately update the UI state to close banners/dialogs
	// This makes the interface feel more responsive
	set({
		consents: newConsents,
		selectedConsents: newConsents,
		showPopup: false,
		consentInfo: {
			time: Date.now(),
			type: type as 'necessary' | 'all' | 'custom',
			identified: !!get().user?.id,
		},
	});

	// Yield to the next task so the UI can paint before running heavier work
	await new Promise<void>((resolve) => setTimeout(resolve, 0));

	// Run after yielding to avoid blocking the click INP
	trackingBlocker?.updateConsents(newConsents);
	updateIframeConsents();
	updateGTMConsent(newConsents);
	updateScripts();

	callbacks.onConsentSet?.({
		preferences: newConsents,
	});

	// Send consent to API in the background - the UI is already updated
	const consent = await manager.setConsent({
		body: {
			type: 'cookie_banner',
			domain: window.location.hostname,
			preferences: newConsents,
			externalSubjectId: get().user?.id,
			identityProvider: get().user?.identityProvider,
			metadata: {
				source: 'consent_widget',
				acceptanceMethod: type,
			},
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
