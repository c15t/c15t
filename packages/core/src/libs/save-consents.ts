import type { StoreApi } from 'zustand';
import type { ConsentStoreState } from '~/store/type';
import type { ConsentManagerInterface } from '../client/client-interface';

interface SaveConsentsProps {
	manager: ConsentManagerInterface;
	type: 'necessary' | 'all' | 'custom';
	get: StoreApi<ConsentStoreState>['getState'];
	set: StoreApi<ConsentStoreState>['setState'];
}

export async function saveConsents({
	manager,
	type,
	get,
	set,
}: SaveConsentsProps) {
	const {
		callbacks,
		selectedConsents,
		consents,
		consentTypes,
		updateScripts,
		updateIframeConsents,
		updateNetworkBlockerConsents,
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
			identified: !!get().user?.id,
		},
	});

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
