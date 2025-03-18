import type { Field } from '~/pkgs/data-model';
import type { C15TOptions } from '~/types';
import { consentPurposeJunctionSchema } from './schema';

/**
 * Generates the database table configuration for the consent-purpose junction entity.
 *
 * This function creates a schema definition that implements a many-to-many relationship
 * between consents and purposes. The resulting schema is used for database migrations,
 * schema validation, and query building.
 *
 * @param options - C15T configuration options that may contain junction table customizations
 * @param junctionFields - Additional fields from plugins to include in the junction table
 * @returns A complete table schema definition with fields, model name, and metadata
 *
 * @example
 * ```typescript
 * const junctionTableSchema = getPurposeJunctionTable(c15tOptions);
 * // Use the schema for migrations or data access
 * const migrationPlans = generateMigrations(junctionTableSchema);
 * ```
 */
export function getPurposeJunctionTable(
	options: C15TOptions,
	junctionFields?: Record<string, Field>
) {
	const purposeJunctionConfig = options.tables?.consentPurposeJunction;
	const consentConfig = options.tables?.consent;
	const purposeConfig = options.tables?.consentPurpose;

	return {
		/**
		 * The name of the junction table in the database, configurable through options
		 */
		entityName: purposeJunctionConfig?.entityName || 'consentPurposeJunction',

		/**
		 * The ID prefix for the consentPurpose junction table
		 * Used to generate unique prefixed IDs for consentPurpose junctions
		 */
		entityPrefix: purposeJunctionConfig?.entityPrefix || 'pjx',

		/**
		 * The schema for the consentPurpose junction table
		 */
		schema: consentPurposeJunctionSchema,

		/**
		 * Field definitions for the consent-purpose junction table
		 */
		fields: {
			/**
			 * Reference to the consent record this junction is associated with
			 */
			consentId: {
				type: 'string',
				required: true,
				fieldName: purposeJunctionConfig?.fields?.consentId || 'consentId',
				references: {
					model: consentConfig?.entityName || 'consent',
					field: 'id',
				},
			},

			/**
			 * Reference to the consentPurpose record this junction is associated with
			 */
			purposeId: {
				type: 'string',
				required: true,
				fieldName: purposeJunctionConfig?.fields?.purposeId || 'purposeId',
				references: {
					model: purposeConfig?.entityName || 'consentPurpose',
					field: 'id',
				},
			},

			/**
			 * Status of this specific consent-purpose relationship
			 * Default: 'active'
			 */
			status: {
				type: 'string',
				defaultValue: () => 'active',
				required: true,
				fieldName: purposeJunctionConfig?.fields?.status || 'status',
			},

			/**
			 * Additional metadata about this specific consent-purpose relationship
			 */
			metadata: {
				type: 'json',
				required: false,
				fieldName: purposeJunctionConfig?.fields?.metadata || 'metadata',
			},

			/**
			 * When the junction record was created
			 * Automatically set to current time by default
			 */
			createdAt: {
				type: 'date',
				defaultValue: () => new Date(),
				required: true,
				fieldName: purposeJunctionConfig?.fields?.createdAt || 'createdAt',
			},

			/**
			 * When the junction record was last updated
			 * Optional, set during updates
			 */
			updatedAt: {
				type: 'date',
				required: false,
				fieldName: purposeJunctionConfig?.fields?.updatedAt || 'updatedAt',
			},

			// Include additional fields from plugins
			...(junctionFields || {}),

			// Include additional fields from configuration
			...(purposeJunctionConfig?.additionalFields || {}),
		},

		/**
		 * Add unique constraint to ensure a consentPurpose can only be associated with a consent once
		 */
		uniqueConstraints: [
			{
				name: 'unique_consent_purpose',
				fields: ['consentId', 'purposeId'],
			},
		],

		/**
		 * Execution order during migrations (lower numbers run first)
		 * Junction table needs to be created after the consent and consentPurpose tables it references
		 */
		order: 4,
	};
}
