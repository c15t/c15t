import {
	booleanField,
	createdAtField,
	dateField,
	defineEntity,
	idField,
	jsonField,
	stringField,
	updatedAtField,
} from '@doubletie/core';

/**
 * Domain entity definition using the new defineEntity pattern.
 *
 * This defines the schema for domains, which represent websites or applications
 * that use the consent management system.
 */
export const domainTable = defineEntity({
	/**
	 * The name of the domain table in the database
	 */
	name: 'domain',

	/**
	 * Description of the entity and its purpose
	 */
	description:
		'A domain is a website or application that uses the consent management system.',

	/**
	 * Execution order during migrations (lower numbers run first)
	 * Domain table needs to be created before tables that reference it
	 */
	order: 1,

	/**
	 * Field definitions for the domain table
	 */
	fields: {
		/**
		 * Unique identifier for this domain record
		 */
		id: idField({ required: true, prefix: 'dom' }),

		/**
		 * Domain name (e.g., "example.com")
		 * This is the primary identifier for the domain in addition to its ID
		 */
		name: stringField({ required: true }),

		/**
		 * Optional human-readable description of the domain
		 */
		description: stringField({ required: false }),

		/**
		 * List of additional origins that are allowed to access resources for this domain
		 * Stored as a JSON array of strings
		 */
		allowedOrigins: jsonField({ required: false, defaultValue: [] }),

		/**
		 * Whether domain ownership has been verified
		 * Default: true
		 */
		isVerified: booleanField({ required: true, defaultValue: true }),

		/**
		 * Whether this domain is currently active
		 * Default: true
		 */
		isActive: booleanField({ required: true, defaultValue: true }),

		/**
		 * When the domain record was created
		 * Automatically set to current time by default
		 */
		createdAt: createdAtField({ required: true }),

		/**
		 * When the domain record was last updated
		 * Optional, set during updates
		 */
		updatedAt: updatedAtField({ required: false }),
	},

	/**
	 * Add unique constraint to ensure domain names are unique
	 */
	uniqueConstraints: [
		{
			name: 'unique_domain_name',
			fields: ['name'],
		},
	],

	/**
	 * Add indexes for better query performance
	 */
	indexes: [
		{
			name: 'name_index',
			fields: ['name'],
		},
		{
			name: 'is_active_index',
			fields: ['isActive'],
		},
	],
});
