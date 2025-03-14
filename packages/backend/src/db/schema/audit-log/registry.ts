import { getWithHooks } from '~/pkgs/data-model/hooks';
import { Where } from '~/pkgs/db-adapters';
import type { GenericEndpointContext, RegistryContext } from '~/pkgs/types';
import { validateEntityOutput } from '../definition';
import type { AuditLog } from './schema';
/**
 * Creates and returns a set of consent audit log adapter methods to interact with the database.
 * These methods provide a consistent interface for creating and querying audit logs
 * while applying hooks and enforcing data validation rules.
 *
 * @param adapter - The database adapter used for direct database operations
 * @param ctx - The context object containing the database adapter, hooks, and options
 * @returns An object containing type-safe consent audit log operations
 *
 * @example
 * ```typescript
 * const auditLogAdapter = createAuditLogAdapter({
 *   adapter: databaseAdapter,
 *   createWithHooks,
 *   options: c15tOptions
 * });
 *
 * // Create a new audit log entry
 * const log = await auditLogAdapter.createAuditLog({
 *   entityType: 'consent',
 *   entityId: 'cns_hadt8w7nngm7xmx2bn',
 *   actionType: 'update',
 *   subjectId: 'sub_x1pftyoufsm7xgo1kv',
 *   changes: { status: { from: 'active', to: 'withdrawn' } }
 * });
 * ```
 */
export function auditLogRegistry({ adapter, ...ctx }: RegistryContext) {
	const { createWithHooks } = getWithHooks(adapter, ctx);

	return {
		/**
		 * Creates a new consent audit log entry in the database.
		 * Automatically sets creation timestamp and applies any
		 * configured hooks during the creation process.
		 *
		 * @param auditLog - Audit log data to create (without id and timestamp)
		 * @param context - Optional endpoint context for hooks
		 * @returns The created audit log entry with all fields populated
		 * @throws May throw an error if hooks prevent creation or if database operations fail
		 */
		createAuditLog: async (
			auditLog: Omit<AuditLog, 'id' | 'createdAt'> & Partial<AuditLog>,
			context?: GenericEndpointContext
		) => {
			const createdLog = await createWithHooks({
				data: {
					createdAt: new Date(),
					...auditLog,
				},
				model: 'auditLog',
				customFn: undefined,
				context,
			});

			if (!createdLog) {
				throw new Error(
					'Failed to create consent audit log - operation returned null'
				);
			}

			return createdLog as AuditLog;
		},

		/**
		 * Finds all audit log entries matching specified filters.
		 * Returns logs with processed output fields according to the schema configuration.
		 *
		 * @param entityType - Optional entity type to filter logs (e.g., 'consent', 'subject')
		 * @param entityId - Optional entity ID to filter logs
		 * @param actionType - Optional action type to filter logs (e.g., 'create', 'update')
		 * @param limit - Optional maximum number of logs to return
		 * @param offset - Optional number of logs to skip for pagination
		 * @returns Array of audit log entries matching the criteria
		 */
		findAuditLogs: async (
			entityType?: string,
			entityId?: string,
			actionType?: string,
			limit?: number,
			offset?: number
		) => {
			const whereConditions: Where<'auditLog'> = [];

			if (entityType) {
				whereConditions.push({
					field: 'entityType',
					value: entityType,
				});
			}

			if (entityId) {
				whereConditions.push({
					field: 'entityId',
					value: entityId,
				});
			}

			if (actionType) {
				whereConditions.push({
					field: 'actionType',
					value: actionType,
				});
			}

			const logs = await adapter.findMany({
				model: 'auditLog',
				where: whereConditions,
				sortBy: {
					field: 'createdAt',
					direction: 'desc',
				},
				limit,
				offset,
			});

			return logs.map((log) =>
				validateEntityOutput('auditLog', log, ctx.options)
			);
		},

		/**
		 * Finds a specific audit log entry by its ID.
		 * Returns the log with processed output fields according to the schema configuration.
		 *
		 * @param auditLogId - The unique identifier of the audit log entry
		 * @returns The audit log entry if found, null otherwise
		 */
		findAuditLogById: async (auditLogId: string) => {
			const log = await adapter.findOne({
				model: 'auditLog',
				where: [
					{
						field: 'id',
						value: auditLogId,
					},
				],
			});
			return log ? validateEntityOutput('auditLog', log, ctx.options) : null;
		},

		/**
		 * Finds all audit log entries for a specific entity.
		 * Returns logs with processed output fields according to the schema configuration.
		 *
		 * @param entityType - The type of entity (e.g., 'consent', 'subject')
		 * @param entityId - The unique identifier of the entity
		 * @param limit - Optional maximum number of logs to return
		 * @returns Array of audit log entries for the specified entity
		 */
		findAuditLogsByEntity: async (
			entityType: string,
			entityId: string,
			limit?: number
		) => {
			const logs = await adapter.findMany({
				model: 'auditLog',
				where: [
					{
						field: 'entityType',
						value: entityType,
					},
					{
						field: 'entityId',
						value: entityId,
					},
				],
				sortBy: {
					field: 'createdAt',
					direction: 'desc',
				},
				limit,
			});
			return logs.map((log) =>
				validateEntityOutput('auditLog', log, ctx.options)
			);
		},

		/**
		 * Counts the total number of audit log entries matching specified filters.
		 * Useful for pagination and reporting.
		 *
		 * @param entityType - Optional entity type to filter logs
		 * @param entityId - Optional entity ID to filter logs
		 * @param actionType - Optional action type to filter logs
		 * @returns The total count of matching audit log entries
		 */
		countAuditLogs: async (
			entityType?: string,
			entityId?: string,
			actionType?: string
		) => {
			const whereConditions: Where<'auditLog'> = [];

			if (entityType) {
				whereConditions.push({
					field: 'entityType',
					value: entityType,
				});
			}

			if (entityId) {
				whereConditions.push({
					field: 'entityId',
					value: entityId,
				});
			}

			if (actionType) {
				whereConditions.push({
					field: 'actionType',
					value: actionType,
				});
			}

			return adapter.count({
				model: 'auditLog',
				where: whereConditions,
			});
		},
	};
}
