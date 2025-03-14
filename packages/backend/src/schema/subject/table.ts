import { COMMON_TIMEZONES, type Field } from '~/pkgs/data-model';
import type { C15TOptions } from '~/pkgs/types';
import { subjectSchema } from './schema';

/**
 * Generates the database table configuration for the subject entity.
 *
 * This function creates a schema definition that includes all standard subject fields
 * and any additional fields from plugins or configuration. The resulting schema is used
 * for database migrations, schema validation, and query building.
 *
 * @param options - C15T configuration options that may contain subject table customizations
 * @param subjectFields - Additional fields from plugins to include in the subject table
 * @returns A complete table schema definition with fields, model name, and metadata
 *
 * @example
 * ```typescript
 * const subjectTableSchema = getSubjectTable(c15tOptions);
 * // Use the schema for migrations or data access
 * const migrationPlans = generateMigrations(subjectTableSchema);
 * ```
 */
export function getSubjectTable(
	options: C15TOptions,
	subjectFields?: Record<string, Field>
) {
	// Get subject config, supporting both the new tables.subject and legacy subject format
	const subjectConfig = options.tables?.subject;

	return {
		/**
		 * The name of the subject table in the database, configurable through options
		 */
		entityName: subjectConfig?.entityName || 'subject',

		/**
		 * The ID prefix for the subject table
		 * Used to generate unique prefixed IDs for subjects
		 */
		entityPrefix: subjectConfig?.entityPrefix || 'sub',

		/**
		 * The Zod schema for the subject table
		 */
		schema: subjectSchema,

		/**
		 * Field definitions for the subject table
		 */
		fields: {
			/**
			 * Whether the subject has been identified/verified
			 * Default: false
			 */
			isIdentified: {
				type: 'boolean',
				defaultValue: () => false,
				required: true,
				fieldName: subjectConfig?.fields?.isIdentified || 'isIdentified',
			},

			/**
			 * External identifier for the subject (from auth providers)
			 * Optional field
			 */
			externalId: {
				type: 'string',
				required: false,
				fieldName: subjectConfig?.fields?.externalId || 'externalId',
			},

			/**
			 * The provider that identified this subject (e.g., 'auth0', 'okta')
			 * Optional field
			 */
			identityProvider: {
				type: 'string',
				required: false,
				fieldName:
					subjectConfig?.fields?.identityProvider || 'identityProvider',
			},

			/**
			 * Last known IP address of the subject
			 * Optional field, useful for security and audit purposes
			 */
			lastIpAddress: {
				type: 'string',
				required: false,
				fieldName: subjectConfig?.fields?.lastIpAddress || 'lastIpAddress',
			},

			/**
			 * When the subject was created
			 * Automatically set to current time by default
			 */
			createdAt: {
				type: 'date',
				defaultValue: () => new Date(),
				required: true,
				fieldName: subjectConfig?.fields?.createdAt || 'createdAt',
			},

			/**
			 * When the subject was last updated
			 * Automatically set to current time on update
			 */
			updatedAt: {
				type: 'date',
				defaultValue: () => new Date(),
				required: true,
				fieldName: subjectConfig?.fields?.updatedAt || 'updatedAt',
			},

			/**
			 * Subject's local timezone, stored as IANA timezone identifier
			 */
			subjectTimezone: {
				type: 'timezone',
				required: false,
				defaultValue: COMMON_TIMEZONES.UTC,
				fieldName: subjectConfig?.fields?.subjectTimezone || 'subjectTimezone',
			},

			// Include additional fields from plugins
			...(subjectFields || {}),

			// Include additional fields from configuration
			...(subjectConfig?.additionalFields || {}),
		},

		/**
		 * Execution order during migrations (lower numbers run first)
		 * Subject table needs to be created early as other tables reference it
		 */
		order: 1,
	};
}
