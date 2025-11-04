import type { StoreApi } from 'zustand';
import type { ConsentManagerInterface } from '~/client/client-interface';
import type { PrivacyConsentState } from '~/store.type';
import type { User } from '~/types/user';

interface IdentifyUserProps {
	user: User;
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
 * @param user - The user's information
 * @param get - The get function from the store
 * @param set - The set function from the store
 */
export async function identifyUser({
	user,
	manager,
	get,
	set,
}: IdentifyUserProps) {
	const { hasConsented, consentInfo } = get();

	const consented = hasConsented() && !!consentInfo?.id;
	const isIdentified = !!consentInfo?.identified;
	console.log('identifyUser', user);
	console.log('consented', consented);
	console.log('isIdentified', isIdentified);
	set({
		user,
	});

	// If the user has consented and is not identified, call the API to identify the user
	if (consented && !isIdentified) {
		await manager.identifyUser({
			body: {
				consentId: consentInfo.id,
				externalId: user.id,
				identityProvider: user.identityProvider,
			},
		});

		set({
			consentInfo: { ...consentInfo, identified: true },
		});
	}
}
