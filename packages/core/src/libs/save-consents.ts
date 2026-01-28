import type { StoreApi } from 'zustand';
import type { ConsentStoreState } from '~/store/type';
import type { ConsentManagerInterface } from '../client/client-interface';
import { generateSubjectId } from './generate-subject-id';

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
		locationInfo,
		model,
		consentInfo,
	} = get();

	const newConsents = selectedConsents ?? consents ?? {};
	const givenAt = Date.now();

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

	// Immediately update the UI state to close banners/dialogs
	// This makes the interface feel more responsive
	set({
		consents: newConsents,
		selectedConsents: newConsents,
		showPopup: false,
		consentInfo: {
			time: givenAt,
			subjectId,
			externalId,
			identityProvider,
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
			subjectId,
			externalSubjectId: externalId,
			identityProvider,
			jurisdiction: locationInfo?.jurisdiction ?? undefined,
			jurisdictionModel: model ?? undefined,
			givenAt,
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
