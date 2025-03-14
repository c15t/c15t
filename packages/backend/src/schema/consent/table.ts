import type { Field } from '~/pkgs/data-model';
import type { C15TOptions } from '~/pkgs/types';
import { consentSchema } from './schema';
/**
 * Generates the database table configuration for the consent entity.
 *
 * This function creates a schema definition that includes all standard consent fields
 * and any additional fields from plugins or configuration. The resulting schema is used
 * for database migrations, schema validation, and query building.
 *
 * @param options - C15T configuration options that may contain consent table customizations
 * @param consentFields - Additional fields from plugins to include in the consent table
 * @returns A complete table schema definition with fields, model name, and metadata
 *
 * @example
 * ```typescript
 * const consentTableSchema = getConsentTable(c15tOptions);
 * // Use the schema for migrations or data access
 * const migrationPlans = generateMigrations(consentTableSchema);
 * ```
 */
export function getConsentTable(
	options: C15TOptions,
	consentFields?: Record<string, Field>
) {
	// Get consent config from the tables structure
	const consentConfig = options.tables?.consent;
	const subjectConfig = options.tables?.subject;
	const domainConfig = options.tables?.domain;
	const policyConfig = options.tables?.consentPolicy;
	const purposeConfig = options.tables?.consentPurpose;

	return {
		/**
		 * The name of the consent table in the database, configurable through options
		 */
		entityName: consentConfig?.entityName || 'consent',

		/**
		 * The ID prefix for the consent table
		 * Used to generate unique prefixed IDs for consents
		 */
		entityPrefix: consentConfig?.entityPrefix || 'cns',

		/**
		 * The schema for the consent table
		 */
		schema: consentSchema,

		/**
		 * Field definitions for the consent table
		 */
		fields: {
			/**
			 * Reference to the subject who gave consent
			 */
			subjectId: {
				type: 'string',
				required: true,
				fieldName: consentConfig?.fields?.subjectId || 'subjectId',
				references: {
					model: subjectConfig?.entityName || 'subject',
					field: 'id',
				},
			},

			/**
			 * Reference to the domain this consent applies to
			 */
			domainId: {
				type: 'string',
				required: true,
				fieldName: consentConfig?.fields?.domainId || 'domainId',
				references: {
					model: domainConfig?.entityName || 'domain',
					field: 'id',
				},
			},

			/**
			 * Array of consentPurpose IDs that this consent applies to
			 * Represents the many-to-many relationship between consent and purposes
			 */
			purposeIds: {
				type: 'json',
				required: false,
				fieldName: consentConfig?.fields?.purposeIds || 'purposeIds',
				references: {
					model: purposeConfig?.entityName || 'consentPurpose',
					field: 'id',
					type: 'array', // Indicates this is an array of references
				},
			},

			/**
			 * Additional metadata about the consent
			 */
			metadata: {
				type: 'json',
				required: false,
				fieldName: consentConfig?.fields?.metadata || 'metadata',
			},

			/**
			 * Reference to the policy version that was accepted
			 */
			policyId: {
				type: 'string',
				required: false,
				fieldName: consentConfig?.fields?.policyId || 'policyId',
				references: {
					model: policyConfig?.entityName || 'consentPolicy',
					field: 'id',
				},
			},

			/**
			 * IP address when consent was given
			 */
			ipAddress: {
				type: 'string',
				required: false,
				fieldName: consentConfig?.fields?.ipAddress || 'ipAddress',
			},

			/**
			 * Subject agent information when consent was given
			 */
			userAgent: {
				type: 'string',
				required: false,
				fieldName: consentConfig?.fields?.userAgent || 'userAgent',
			},

			/**
			 * Status of the consent (active, expired, withdrawn)
			 * Default: 'active'
			 */
			status: {
				type: 'string',
				defaultValue: () => 'active',
				required: true,
				fieldName: consentConfig?.fields?.status || 'status',
			},

			/**
			 * Reason for consentWithdrawal, if consent was withdrawn
			 */
			withdrawalReason: {
				type: 'string',
				required: false,
				fieldName:
					consentConfig?.fields?.withdrawalReason || 'withdrawalReason',
			},

			/**
			 * When the consent was given
			 * Automatically set to current time
			 */
			givenAt: {
				type: 'date',
				defaultValue: () => new Date(),
				required: true,
				fieldName: consentConfig?.fields?.givenAt || 'givenAt',
			},

			/**
			 * When the consent expires
			 * Calculated based on givenAt + expiresIn setting
			 */
			validUntil: {
				type: 'date',
				required: false,
				fieldName: consentConfig?.fields?.validUntil || 'validUntil',
				transform: {
					input: (val: Date | undefined, data: Record<string, unknown>) => {
						if (val) {
							return val;
						}

						const expiresIn = consentConfig?.expiresIn || 31536000; // Default: 1 year
						const givenAt =
							data.givenAt instanceof Date ? data.givenAt : new Date();

						if (expiresIn > 0) {
							const validUntil = new Date(givenAt);
							validUntil.setSeconds(validUntil.getSeconds() + expiresIn);
							return validUntil;
						}

						return undefined; // No expiration
					},
				},
			},

			/**
			 * Whether the consent is active
			 * Default: true
			 */
			isActive: {
				type: 'boolean',
				defaultValue: true,
				required: true,
				fieldName: consentConfig?.fields?.isActive || 'isActive',
			},

			// Include additional fields from plugins
			...(consentFields || {}),

			// Include additional fields from configuration
			...(consentConfig?.additionalFields || {}),
		},

		/**
		 * Execution order during migrations (lower numbers run first)
		 * Consent table needs to be created after the subject, domain, and policy tables it references
		 */
		order: 3,
	};
}
