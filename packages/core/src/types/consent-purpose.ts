/**
 * Definition of a consent purpose.
 *
 * Consent purposes represent different categories of data processing
 * that users may consent to or decline.
 */
export interface ConsentPurpose {
	/**
	 * Unique identifier for the consent purpose
	 */
	id: string;

	/**
	 * Human-readable name of the purpose
	 */
	name: string;

	/**
	 * Detailed description explaining the purpose
	 */
	description: string;

	/**
	 * Whether this purpose is required for system functionality
	 * (users cannot opt out of required purposes)
	 */
	required: boolean;

	/**
	 * Optional legal basis for processing under applicable privacy laws
	 */
	legalBasis?: string;

	/**
	 * Optional data retention period for data collected under this purpose
	 */
	retentionPeriod?: string;

	/**
	 * Optional list of third parties who may receive data under this purpose
	 */
	thirdParties?: string[];
}
