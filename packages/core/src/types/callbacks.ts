import type { JurisdictionCode } from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';
import type { ConsentStoreState } from '../store/type';

/**
 * A generic type for callback functions that can accept an argument of type T.
 *
 * @public
 */
export type Callback<T = void> = (arg: T) => void;

/**
 * Payload types for the callbacks
 */
export type OnBannerFetchedPayload = {
	jurisdiction: JurisdictionCode | { code: JurisdictionCode; message: string };
	location: {
		countryCode: string | null;
		regionCode: string | null;
	};
	translations: {
		language: string;
		translations: Translations;
	};
};
export type OnConsentSetPayload = {
	preferences: ConsentStoreState['consents'];
};
export type OnErrorPayload = {
	error: string;
};

/**
 * Defines the structure for callback functions that respond to consent-related events.
 * These callbacks enable custom actions at different stages of the consent management process.
 *
 * @remarks
 * All callbacks are optional and will be called at specific points in the consent management lifecycle:
 *
 * onBannerFetched: Consent banner fetched
 * onConsentSet: Consent set
 * onError: Error
 *
 * @public
 */
export interface Callbacks {
	/**
	 * Called when the consent banner is fetched.
	 *
	 * @param payload - The payload containing the consent banner information
	 */
	onBannerFetched?: Callback<OnBannerFetchedPayload>;
	/**
	 * Called when the consent is set.
	 *
	 * @remarks
	 * Consent may be set automatically in certain cases, such as
	 * when no jurisdiction is detected or when the store is initialized
	 * with default consents. If you use setCallbacks() to set this
	 * callback, it will be called immediately with the store's consent state.
	 *
	 * @param payload - The payload containing the consent state
	 */
	onConsentSet?: Callback<OnConsentSetPayload>;
	/**
	 * Called when an error occurs.
	 *
	 * @param payload - The payload containing the error information
	 */
	onError?: Callback<OnErrorPayload>;
}
