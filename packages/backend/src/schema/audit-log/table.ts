import { COMMON_TIMEZONES, type Field } from '~/pkgs/data-model';
import type { C15TOptions } from '~/types';
import { auditLogSchema } from './schema';

/**
 * Generates the database table configuration for the consent audit log entity.
 *
 * This function creates a schema definition that includes all standard audit log fields
 * and any additional fields from plugins or configuration. The resulting schema is used
 * for database migrations, schema validation, and query building.
 *
 * @param options - c15t configuration options that may contain audit log table customizations
 * @param auditLogFields - Additional fields from plugins to include in the audit log table
 * @returns A complete table schema definition with fields, model name, and metadata
 *
 * @example
 * ```typescript
 * const auditLogTableSchema = getAuditLogTable(c15tOptions);
 * // Use the schema for migrations or data access
 * const migrationPlans = generateMigrations(auditLogTableSchema);
 * ```
 */
export function getAuditLogTable(
	options: C15TOptions,
	auditLogFields?: Record<string, Field>
) {
	const auditLogConfig = options.tables?.auditLog;
	const subjectConfig = options.tables?.subject;

	return {
		/**
		 * The name of the audit log table in the database, configurable through options
		 */
		entityName: auditLogConfig?.entityName || 'auditLog',

		/**
		 * The ID prefix for the audit log table
		 * Used to generate unique prefixed IDs
		 */
		entityPrefix: auditLogConfig?.entityPrefix || 'log',

		/**
		 * The schema for the audit log table
		 */
		schema: auditLogSchema,

		/**
		 * Field definitions for the consent audit log table
		 */
		fields: {
			/**
			 * Type of entity this audit log entry is about (e.g., 'consent', 'subject', 'consentPurpose')
			 */
			entityType: {
				type: 'string',
				required: true,
				fieldName: auditLogConfig?.fields?.entityType || 'entityType',
			},

			/**
			 * ID of the entity this audit log entry is about
			 */
			entityId: {
				type: 'string',
				required: true,
				fieldName: auditLogConfig?.fields?.entityId || 'entityId',
			},

			/**
			 * Type of action that was performed on the entity
			 * Common values: 'create', 'update', 'delete', 'view'
			 */
			actionType: {
				type: 'string',
				required: true,
				fieldName: auditLogConfig?.fields?.actionType || 'actionType',
			},

			/**
			 * Optional ID of the subject who performed the action
			 */
			subjectId: {
				type: 'string',
				required: false,
				fieldName: auditLogConfig?.fields?.subjectId || 'subjectId',
				references: {
					model: subjectConfig?.entityName || 'subject',
					field: 'id',
				},
			},

			/**
			 * IP address from which the action was performed
			 */
			ipAddress: {
				type: 'string',
				required: false,
				fieldName: auditLogConfig?.fields?.ipAddress || 'ipAddress',
			},

			/**
			 * Subject agent (browser/device) from which the action was performed
			 */
			userAgent: {
				type: 'string',
				required: false,
				fieldName: auditLogConfig?.fields?.userAgent || 'userAgent',
			},

			/**
			 * Detailed changes made to the entity
			 * For updates, this typically contains before/after values
			 */
			changes: {
				type: 'json',
				required: false,
				fieldName: auditLogConfig?.fields?.changes || 'changes',
			},

			/**
			 * Additional metadata about the action
			 */
			metadata: {
				type: 'json',
				required: false,
				fieldName: auditLogConfig?.fields?.metadata || 'metadata',
			},

			/**
			 * When the audit log entry was created
			 * Automatically set to current time by default
			 */
			createdAt: {
				type: 'date',
				defaultValue: () => new Date(),
				required: true,
				fieldName: auditLogConfig?.fields?.createdAt || 'createdAt',
			},

			/**
			 * Timezone where the audit event occurred
			 */
			eventTimezone: {
				type: 'timezone',
				required: true,
				defaultValue: COMMON_TIMEZONES.UTC,
				fieldName: auditLogConfig?.fields?.eventTimezone || 'eventTimezone',
			},

			// Include additional fields from plugins
			...(auditLogFields || {}),

			// Include additional fields from configuration
			...(auditLogConfig?.additionalFields || {}),
		},

		/**
		 * Add indexes for better query performance
		 */
		indexes: [
			{
				name: 'entity_index',
				fields: ['entityType', 'entityId'],
			},
			{
				name: 'action_type_index',
				fields: ['actionType'],
			},
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
		 * Audit log table needs to be created after the subject table it references
		 */
		order: 5,
	};
}
