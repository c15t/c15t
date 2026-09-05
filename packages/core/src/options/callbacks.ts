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
	 * This callback is triggered when `reloadOnConsentRevoked` is enabled
	 * and a user revokes consent that was previously granted. Use this
	 * callback to show a loading state or perform any cleanup before
	 * the page reloads.
	 *
	 * Note: This callback runs synchronously before the reload, so
	 * avoid long-running operations.
	 *
	 * @param payload - The payload containing the new consent preferences
	 */
	onBeforeConsentRevocationReload?: Callback<{ preferences: ConsentState }>;
}
