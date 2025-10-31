import type { StoreApi } from 'zustand';
import type { ConsentManagerInterface } from '~/client/client-interface';
import type { PrivacyConsentState } from '~/store.type';

interface IdentifyUserProps {
	externalId: string;
	manager: ConsentManagerInterface;
	get: StoreApi<PrivacyConsentState>['getState'];
	set: StoreApi<PrivacyConsentState>['setState'];
}

/**
 * Identifies the user by setting the external ID in the store
 *
 * @remarks
 * If the user has consented, it will call the API to identify the user.
 *
 * @param externalId - The external ID of the user
 * @param get - The get function from the store
 * @param set - The set function from the store
 */
export async function identifyUser({
	externalId,
	manager,
	get,
	set,
}: IdentifyUserProps) {
	const { hasConsented, consentInfo } = get();

	const consented = hasConsented() && !!consentInfo?.id;
	const isIdentified = !!consentInfo?.identified;

	set({
		externalId,
	});

	// If the user has consented and is not identified, call the API to identify the user
	if (consented && !isIdentified) {
		await manager.identifyUser({
			body: { consentId: consentInfo.id, externalId },
		});

		set({
			consentInfo: { ...consentInfo, identified: true },
		});
	}
}
