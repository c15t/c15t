import type { Field } from '~/pkgs/data-model';
import type { C15TOptions } from '~/types';
import { consentPolicySchema } from './schema';

/**
 * Generates the database table configuration for the consent policy entity.
 *
 * This function creates a schema definition that includes all standard consent policy fields
 * and any additional fields from plugins or configuration. The resulting schema is used
 * for database migrations, schema validation, and query building.
 *
 * @param options - C15T configuration options that may contain policy table customizations
 * @param policyFields - Additional fields from plugins to include in the policy table
 * @returns A complete table schema definition with fields, model name, and metadata
 *
 * @example
 * ```typescript
 * const policyTableSchema = getConsentPolicyTable(c15tOptions);
 * // Use the schema for migrations or data access
 * const migrationPlans = generateMigrations(policyTableSchema);
 * ```
 */
export function getConsentPolicyTable(
	options: C15TOptions,
	policyFields?: Record<string, Field>
) {
	const consentPolicyConfig = options.tables?.consentPolicy;

	return {
		/**
		 * The name of the policy table in the database, configurable through options
		 */
		entityName: consentPolicyConfig?.entityName || 'consentPolicy',

		/**
		 * The ID prefix for the consent policy table
		 * Used to generate unique prefixed IDs for consent policies
		 */
		entityPrefix: consentPolicyConfig?.entityPrefix || 'pol',

		/**
		 * The schema for the consent policy table
		 */
		schema: consentPolicySchema,

		/**
		 * Field definitions for the consent policy table
		 */
		fields: {
			/**
			 * Version identifier for the policy (e.g., "1.0.0")
			 */
			version: {
				type: 'string',
				required: true,
				fieldName: consentPolicyConfig?.fields?.version || 'version',
			},

			/**
			 * Human-readable name of the policy
			 */
			name: {
				type: 'string',
				required: true,
				fieldName: consentPolicyConfig?.fields?.name || 'name',
			},

			/**
			 * Date when the policy becomes effective
			 */
			effectiveDate: {
				type: 'date',
				required: true,
				fieldName:
					consentPolicyConfig?.fields?.effectiveDate || 'effectiveDate',
			},

			/**
			 * Optional date when the policy expires
			 */
			expirationDate: {
				type: 'date',
				required: false,
				fieldName:
					consentPolicyConfig?.fields?.expirationDate || 'expirationDate',
			},

			/**
			 * Full content of the policy document
			 */
			content: {
				type: 'string',
				required: true,
				fieldName: consentPolicyConfig?.fields?.content || 'content',
			},

			/**
			 * Hash of the content for integrity validation
			 */
			contentHash: {
				type: 'string',
				required: true,
				fieldName: consentPolicyConfig?.fields?.contentHash || 'contentHash',
			},

			/**
			 * Whether this policy is currently active
			 * Default: true
			 */
			isActive: {
				type: 'boolean',
				defaultValue: true,
				required: true,
				fieldName: consentPolicyConfig?.fields?.isActive || 'isActive',
			},

			/**
			 * When the policy record was created
			 * Automatically set to current time by default
			 */
			createdAt: {
				type: 'date',
				defaultValue: () => new Date(),
				required: true,
				fieldName: consentPolicyConfig?.fields?.createdAt || 'createdAt',
			},

			// Include additional fields from plugins
			...(policyFields || {}),

			// Include additional fields from configuration
			...(consentPolicyConfig?.additionalFields || {}),
		},

		/**
		 * Execution order during migrations (lower numbers run first)
		 * Policy table needs to be created before tables that reference it (like consent)
		 */
		order: 2,
	};
}
