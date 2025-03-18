import {
	booleanField,
	createField,
	createdAtField,
	defineEntity,
	idField,
	stringField,
	updatedAtField,
} from '@doubletie/core';


/**
 * Subject entity definition using the new defineEntity pattern.
 *
 * This defines the schema for subjects, which represent the users or entities
 * that give or withdraw consent.
 */
export const subjectTable = defineEntity({
	/**
	 * The name of the subject table in the database
	 */
	name: 'subject',

	/**
	 * Description of the entity and its purpose
	 */
	description: 'A subject is a user or entity that gives or withdraws consent.',

	/**
	 * Execution order during migrations (lower numbers run first)
	 * Subject table needs to be created early as other tables reference it
	 */
	order: 1,

	/**
	 * Field definitions for the subject table
	 */
	fields: {
		/**
		 * Unique identifier for this subject record
		 */
		id: idField({ required: true, prefix: 'sub' }),

		/**
		 * Whether the subject has been identified/verified
		 * Default: false
		 */
		isIdentified: booleanField({ required: true, defaultValue: false }),

		/**
		 * External identifier for the subject (from auth providers)
		 * Optional field
		 */
		externalId: stringField({ required: false }),

		/**
		 * The provider that identified this subject (e.g., 'auth0', 'okta')
		 * Optional field
		 */
		identityProvider: stringField({ required: false }),

		/**
		 * Last known IP address of the subject
		 * Optional field, useful for security and audit purposes
		 */
		lastIpAddress: stringField({ required: false }),

		/**
		 * When the subject was created
		 * Automatically set to current time by default
		 */
		createdAt: createdAtField({ required: true }),

		/**
		 * When the subject was last updated
		 * Automatically set to current time on update
		 */
		updatedAt: updatedAtField({ required: true }),

		/**
		 * Subject's local timezone, stored as IANA timezone identifier
		 */
		subjectTimezone: createField('string', {
			required: false,
			defaultValue: 'UTC',
		}),
	},

	/**
	 * Add indexes for better query performance
	 */
	indexes: [
		{
			name: 'external_id_index',
			fields: ['externalId'],
		},
		{
			name: 'identity_provider_index',
			fields: ['identityProvider'],
		},
		{
			name: 'is_identified_index',
			fields: ['isIdentified'],
		},
	],
});
