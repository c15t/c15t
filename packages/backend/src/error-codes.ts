export const C15T_ERROR_CODES = Object.freeze({
	/**
	 * The requested consent record could not be found.
	 * This may occur when attempting to retrieve, update, or delete a non-existent consent record.
	 */
	CONSENT_NOT_FOUND: 'Consent not found',

	/**
	 * The consent record has expired and is no longer valid.
	 * This may occur when attempting to use a consent record after its expiration date.
	 */
	CONSENT_EXPIRED: 'Consent has expired',

	/**
	 * An error occurred while attempting to create a new consent record.
	 * This may be due to validation errors, storage issues, or other internal errors.
	 */
	FAILED_TO_CREATE_CONSENT: 'Failed to create consent',

	/**
	 * An error occurred while attempting to update an existing consent record.
	 * This may be due to validation errors, storage issues, or concurrent modifications.
	 */
	FAILED_TO_UPDATE_CONSENT: 'Failed to update consent',

	/**
	 * An error occurred while attempting to retrieve a consent record.
	 * This may be due to storage issues, permissions, or other internal errors.
	 */
	FAILED_TO_GET_CONSENT: 'Failed to get consent',

	/**
	 * An error occurred while attempting to create a new consent consentPurpose.
	 * This may be due to validation errors, duplicate consentPurpose IDs, or other internal errors.
	 */
	FAILED_TO_CREATE_PURPOSE: 'Failed to create consentPurpose',

	/**
	 * The requested consent consentPurpose could not be found.
	 * This may occur when attempting to retrieve, update, or delete a non-existent consentPurpose.
	 */
	PURPOSE_NOT_FOUND: 'Consent Purpose not found',

	/**
	 * Plugin initialization failed.
	 * This may occur when a plugin cannot be initialized due to configuration
	 * errors, missing dependencies, or other setup issues.
	 */
	PLUGIN_INITIALIZATION_FAILED: 'Plugin initialization failed',

	/**
	 * Error retrieving API endpoints.
	 * This may occur when the system cannot retrieve API endpoints due to
	 * configuration errors or other internal issues.
	 */
	API_RETRIEVAL_ERROR: 'API retrieval error',
});
