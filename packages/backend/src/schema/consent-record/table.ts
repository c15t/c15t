import type { Field } from '~/pkgs/data-model';
import type { C15TOptions } from '~/types';
import { consentRecordSchema } from './schema';

/**
 * Generates the database table configuration for the consent record entity.
 *
 * This function creates a schema definition that includes all standard consent record fields
 * and any additional fields from plugins or configuration. The resulting schema is used
 * for database migrations, schema validation, and query building.
 *
 * @param options - c15t configuration options that may contain consent record table customizations
 * @param recordFields - Additional fields from plugins to include in the consent record table
 * @returns A complete table schema definition with fields, model name, and metadata
 *
 * @example
 * ```typescript
 * const recordTableSchema = getConsentRecordTable(c15tOptions);
 * // Use the schema for migrations or data access
 * const migrationPlans = generateMigrations(recordTableSchema);
 * ```
 */
export function getConsentRecordTable(
	options: C15TOptions,
	recordFields?: Record<string, Field>
) {
	// Get record config, supporting both the new tables.record and legacy record format
	const recordConfig = options.tables?.record;
	const subjectConfig = options.tables?.subject;
	const consentConfig = options.tables?.consent;

	return {
		/**
		 * The name of the consent record table in the database, configurable through options
		 */
		entityName: recordConfig?.entityName || 'consentRecord',

		/**
		 * The ID prefix for the consent record table
		 * Used to generate unique prefixed IDs for records
		 */
		entityPrefix: recordConfig?.entityPrefix || 'rec',

		/**
		 * The schema for the consent record table
		 */
		schema: consentRecordSchema,

		/**
		 * Field definitions for the consent record table
		 */
		fields: {
			/**
			 * Reference to the subject associated with this consent record
			 */
			subjectId: {
				type: 'string',
				required: true,
				fieldName: recordConfig?.fields?.subjectId || 'subjectId',
				references: {
					model: subjectConfig?.entityName || 'subject',
					field: 'id',
				},
			},

			/**
			 * Optional reference to the specific consent this record is about
			 * May be null for general consent actions not related to a specific consent
			 */
			consentId: {
				type: 'string',
				required: false,
				fieldName: recordConfig?.fields?.consentId || 'consentId',
				references: {
					model: consentConfig?.entityName || 'consent',
					field: 'id',
				},
			},

			/**
			 * Type of consent action this record represents
			 * Common values: 'given', 'withdrawn', 'updated', 'expired', 'requested'
			 */
			actionType: {
				type: 'string',
				required: true,
				fieldName: recordConfig?.fields?.actionType || 'actionType',
			},

			/**
			 * Additional details about the consent action
			 * May include IP address, subject agent, reason for withdrawal, etc.
			 */
			details: {
				type: 'json',
				required: false,
				fieldName: recordConfig?.fields?.details || 'details',
			},

			/**
			 * When the consent record was created
			 * Automatically set to current time by default
			 */
			createdAt: {
				type: 'date',
				defaultValue: () => new Date(),
				required: true,
				fieldName: recordConfig?.fields?.createdAt || 'createdAt',
			},

			// Include additional fields from plugins
			...(recordFields || {}),

			// Include additional fields from configuration
			...(recordConfig?.additionalFields || {}),
		},

		/**
		 * Execution order during migrations (lower numbers run first)
		 * Consent record table needs to be created after the subject and consent tables it references
		 */
		order: 4,
	};
}
