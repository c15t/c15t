/**
 * Runtime overrides for geo/language detection.
 *
 * Every field is optional; unset fields fall back to server-side detection.
 */
export interface Overrides {
	/** ISO 3166-1 alpha-2 country code (for example `"DE"`). */
	country?: string;
	/** Region or state code within the country (for example `"CA"`). */
	region?: string;
	/** BCP 47 language tag used to select translations (for example `"de-DE"`). */
	language?: string;
	/** Global Privacy Control signal override. */
	gpc?: boolean;
}
