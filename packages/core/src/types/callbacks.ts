import type {
	JurisdictionInfo,
	PrivacyConsentState,
	Translations,
} from '../index';

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
	showConsentBanner: boolean;
	jurisdiction: JurisdictionInfo;
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
	preferences: PrivacyConsentState['consents'];
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
	onBannerFetched?: Callback<OnBannerFetchedPayload>;
	onConsentSet?: Callback<OnConsentSetPayload>;
	onError?: Callback<OnErrorPayload>;
}
