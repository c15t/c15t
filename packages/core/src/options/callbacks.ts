import type { JurisdictionCode } from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';

import type { ConsentState } from '../consent/compliance';
import type { KernelEvent } from '../types';

/**
 * A generic type for callback functions that can accept an argument of type T.
 *
 * @public
 */
export type Callback<T = void> = (arg: T) => void;

/**
 * Payload types for the callbacks
 */
export interface OnBannerFetchedPayload {
	jurisdiction: JurisdictionCode | { code: JurisdictionCode; message: string };
	location: {
		countryCode: string | null;
		regionCode: string | null;
	};
	translations: {
		language: string;
		translations: Translations;
	};
}
export interface OnErrorPayload {
	error: string;
}

export type OnChoiceRecordedPayload = Omit<
	Extract<KernelEvent, { type: 'choice:recorded' }>,
	'type'
>;
export type OnPermissionsChangedPayload = Omit<
	Extract<KernelEvent, { type: 'permissions:changed' }>,
	'type'
>;

export interface Callbacks {
	/** Runs only for an explicit accept, reject or save action. */
	onChoiceRecorded?: Callback<OnChoiceRecordedPayload>;
	/** Runs only when effective permissions change. */
	onPermissionsChanged?: Callback<OnPermissionsChangedPayload>;
	/**
	 * Called when the consent banner is fetched.
	 *
	 * @param payload - The payload containing the consent banner information
	 */
	onBannerFetched?: Callback<OnBannerFetchedPayload>;
	/**
	 * Called when an error occurs.
	 *
	 * @param payload - The payload containing the error information
	 */
	onError?: Callback<OnErrorPayload>;

	/**
	 * Called before the page reloads when consent is revoked.
	 *
	 * @remarks
	 * Runs when `reloadOnConsentRevoked` is enabled (the default) and an
	 * accept, reject or save turns off a category or vendor that was
	 * granted. Expiry, policy changes and privacy signals do not reload.
	 * Use it to show a loading state or call a vendor's shutdown API.
	 *
	 * Runs synchronously before the reload, so avoid long-running work.
	 *
	 * @param payload - The effective permissions after the revocation.
	 */
	onBeforeConsentRevocationReload?: Callback<{ preferences: ConsentState }>;
}
