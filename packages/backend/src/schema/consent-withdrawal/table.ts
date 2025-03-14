import type { Field } from '~/pkgs/data-model';
import type { C15TOptions } from '~/pkgs/types';
import { consentWithdrawalSchema } from './schema';

/**
 * Generates the database table configuration for the consent withdrawal entity.
 *
 * This function creates a schema definition that includes all standard consentWithdrawal fields
 * and any additional fields from plugins or configuration. The resulting schema is used
 * for database migrations, schema validation, and query building.
 *
 * @param options - C15T configuration options that may contain consentWithdrawal table customizations
 * @param withdrawalFields - Additional fields from plugins to include in the consentWithdrawal table
 * @returns A complete table schema definition with fields, model name, and metadata
 *
 * @example
 * ```typescript
 * const withdrawalTableSchema = getConsentWithdrawalTable(c15tOptions);
 * // Use the schema for migrations or data access
 * const migrationPlans = generateMigrations(withdrawalTableSchema);
 * ```
 */
export function getConsentWithdrawalTable(
	options: C15TOptions,
	withdrawalFields?: Record<string, Field>
) {
	const consentWithdrawalConfig = options.tables?.consentWithdrawal;
	const consentConfig = options.tables?.consent;
	const subjectConfig = options.tables?.subject;

	return {
		/**
		 * The name of the consentWithdrawal table in the database, configurable through options
		 */
		entityName: consentWithdrawalConfig?.entityName || 'consentWithdrawal',

		/**
		 * The ID prefix for the consentWithdrawal table
		 * Used to generate unique prefixed IDs for consentWithdrawals
		 */
		entityPrefix: consentWithdrawalConfig?.entityPrefix || 'wdr',

		/**
		 * The schema for the consent withdrawal table
		 */
		schema: consentWithdrawalSchema,

		/**
		 * Field definitions for the consent withdrawal table
		 */
		fields: {
			/**
			 * Reference to the consent that was withdrawn
			 */
			consentId: {
				type: 'string',
				required: true,
				fieldName: consentWithdrawalConfig?.fields?.consentId || 'consentId',
				references: {
					model: consentConfig?.entityName || 'consent',
					field: 'id',
				},
			},

			/**
			 * Reference to the subject who withdrew consent
			 */
			subjectId: {
				type: 'string',
				required: true,
				fieldName: consentWithdrawalConfig?.fields?.subjectId || 'subjectId',
				references: {
					model: subjectConfig?.entityName || 'subject',
					field: 'id',
				},
			},

			/**
			 * Reason provided for withdrawing consent
			 */
			withdrawalReason: {
				type: 'string',
				required: false,
				fieldName:
					consentWithdrawalConfig?.fields?.withdrawalReason ||
					'withdrawalReason',
			},

			/**
			 * Method by which consent was withdrawn
			 * Common values: 'subject-initiated', 'automatic-expiry', 'admin'
			 */
			withdrawalMethod: {
				type: 'string',
				defaultValue: () => 'subject-initiated',
				required: true,
				fieldName:
					consentWithdrawalConfig?.fields?.withdrawalMethod ||
					'withdrawalMethod',
			},

			/**
			 * IP address from which the consentWithdrawal was initiated
			 */
			ipAddress: {
				type: 'string',
				required: false,
				fieldName: consentWithdrawalConfig?.fields?.ipAddress || 'ipAddress',
			},

			/**
			 * Subject agent (browser/device) from which the consentWithdrawal was initiated
			 */
			userAgent: {
				type: 'string',
				required: false,
				fieldName: consentWithdrawalConfig?.fields?.userAgent || 'userAgent',
			},

			/**
			 * Additional metadata about the consentWithdrawal
			 */
			metadata: {
				type: 'json',
				required: false,
				fieldName: consentWithdrawalConfig?.fields?.metadata || 'metadata',
			},

			/**
			 * When the consentWithdrawal record was created
			 * Automatically set to current time by default
			 */
			createdAt: {
				type: 'date',
				defaultValue: () => new Date(),
				required: true,
				fieldName: consentWithdrawalConfig?.fields?.createdAt || 'createdAt',
			},

			// Include additional fields from plugins
			...(withdrawalFields || {}),

			// Include additional fields from configuration
			...(consentWithdrawalConfig?.additionalFields || {}),
		},

		/**
		 * Add unique constraint to ensure a consent can only be withdrawn once
		 * (If this constraint is not desired, it can be disabled in options)
		 */
		uniqueConstraints:
			consentWithdrawalConfig?.preventMultipleWithdrawals !== false
				? [
						{
							name: 'unique_consent_withdrawal',
							fields: ['consentId'],
						},
					]
				: [],

		/**
		 * Add indexes for better query performance
		 */
		indexes: [
			{
				name: 'subject_id_index',
				fields: ['subjectId'],
			},
			{
				name: 'created_at_index',
				fields: ['createdAt'],
			},
		],

		/**
		 * Execution order during migrations (lower numbers run first)
		 * Withdrawal table needs to be created after the consent and subject tables it references
		 */
		order: 4,
	};
}
