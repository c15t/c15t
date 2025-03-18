import {
	createField,
	createdAtField,
	defineEntity,
	idField,
	updatedAtField,
} from '@doubletie/core';

/**
 * Generates the database table configuration for the consent audit log entity.
 *
 * This function creates a schema definition that includes all standard audit log fields
 * and any additional fields from plugins or configuration. The resulting schema is used
 * for database migrations, schema validation, and query building.
 */
export const auditLogTable = defineEntity({
	/**
	 * The name of the audit log table
	 */
	name: 'auditLog',
	/**
	 * The description of the audit log table
	 */
	description:
		'An audit log is a record of all actions taken on the system, including consent actions.',
	/**
	 * Execution order during migrations (lower numbers run first)
	 * Audit log table needs to be created after the subject table it references
	 */
	order: 5,
	/**
	 * Field definitions for the audit log table
	 */
	fields: {
		/**
		 * Unique identifier for the audit log entry
		 */
		id: idField({ required: true, prefix: 'log' }),

		/**
		 * Type of entity this audit log entry is about (e.g., 'consent', 'subject', 'consentPurpose')
		 */
		entityType: createField('string', { required: true }),

		/**
		 * ID of the entity this audit log entry is about
		 */
		entityId: createField('string', { required: true }),

		/**
		 * Type of action that was performed on the entity
		 * Common values: 'create', 'update', 'delete', 'view'
		 */
		actionType: createField('string', { required: true }),

		/**
		 * Optional ID of the subject who performed the action
		 */
		subjectId: createField('string', { required: false }),

		/**
		 * IP address from which the action was performed
		 */
		ipAddress: createField('string', { required: false }),

		/**
		 * Subject agent (browser/device) from which the action was performed
		 */
		userAgent: createField('string', { required: false }),

		/**
		 * Detailed changes made to the entity
		 * For updates, this typically contains before/after values
		 */
		changes: createField('json', { required: false }),

		/**
		 * Additional metadata about the action
		 */
		metadata: createField('json', { required: false }),

		/**
		 * When the audit log entry was created
		 * Automatically set to current time by default
		 */
		createdAt: createdAtField({ required: true }),

		/**
		 * When the audit log entry was last updated
		 */
		updatedAt: updatedAtField({ required: true }),
	},
});
