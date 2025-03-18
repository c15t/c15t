import {
	booleanField,
	createdAtField,
	dateField,
	defineEntity,
	idField,
	stringField,
	updatedAtField,
} from '@doubletie/core';

/**
 * Consent policy entity definition using the new defineEntity pattern.
 *
 * This defines the schema for consent policies which contain versioned terms,
 * privacy policies, and other legal documents that users consent to.
 */
export const consentPolicyTable = defineEntity({
	/**
	 * The name of the consent policy table
	 */
	name: 'consentPolicy',

	/**
	 * Description of the entity and its purpose
	 */
	description:
		'A consent policy is a versioned terms, privacy policies, and other legal documents that users consent to.',

	/**
	 * Execution order during migrations (lower numbers run first)
	 * Policy table needs to be created before tables that reference it (like consent)
	 */
	order: 2,

	/**
	 * Field definitions for the consent policy table
	 */
	fields: {
		/**
		 * Unique identifier for the consent policy record
		 */
		id: idField({ required: true, prefix: 'pol' }),

		/**
		 * Version identifier for the policy (e.g., "1.0.0")
		 */
		version: stringField({ required: true }),

		/**
		 * Human-readable name of the policy
		 */
		name: stringField({ required: true }),

		/**
		 * Date when the policy becomes effective
		 */
		effectiveDate: dateField({ required: true }),

		/**
		 * Optional date when the policy expires
		 */
		expirationDate: dateField({ required: false }),

		/**
		 * Full content of the policy document
		 */
		content: stringField({ required: true }),

		/**
		 * Hash of the content for integrity validation
		 */
		contentHash: stringField({ required: true }),

		/**
		 * Whether this policy is currently active
		 * Default: true
		 */
		isActive: booleanField({ required: true, defaultValue: true }),

		/**
		 * When the policy record was created
		 * Automatically set to current time by default
		 */
		createdAt: createdAtField({ required: true }),

		/**
		 * When the policy record was last updated
		 */
		updatedAt: updatedAtField({ required: true }),
	},

	/**
	 * Indexes for the consent policy table
	 */
	indexes: [
		{
			name: 'version_index',
			fields: ['version'],
		},
		{
			name: 'effective_date_index',
			fields: ['effectiveDate'],
		},
		{
			name: 'is_active_index',
			fields: ['isActive'],
		},
	],
});
