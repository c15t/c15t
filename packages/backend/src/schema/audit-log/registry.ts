import { getWithHooks } from '~/pkgs/data-model';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { GenericEndpointContext, RegistryContext } from '~/pkgs/types';

import type { AuditLog } from './schema';

/**
 * Creates and returns a set of audit log adapter methods to interact with the database.
 * These methods provide a consistent interface for creating and querying audit logs
 * while applying hooks and enforcing data validation rules.
 *
 * The audit log system tracks changes to entities in the system, providing a historical
 * record of modifications for compliance, debugging, and auditing purposes.
 *
 * @param params - Registry context parameters
 * @param params.adapter - The database adapter used for direct database operations
 * @param params.ctx - Additional context properties containing hooks and options
 * @returns An object containing type-safe audit log operations
 *
 * @example
 * ```ts
 * const registry = auditLogRegistry({
 *   adapter: databaseAdapter,
 *   hooks: customHooks,
 *   options: validationOptions
 * });
 *
 * // Use the registry to create an audit log entry
 * const logEntry = await registry.createAuditLog({
 *   entityType: 'consent',
 *   entityId: 'cns_hadt8w7nngm7xmx2bn',
 *   actionType: 'update',
 *   subjectId: 'sub_x1pftyoufsm7xgo1kv',
 *   changes: { status: { from: 'active', to: 'withdrawn' } }
 * });
 * ```
 *
 * @see {@link RegistryContext} For details on the context parameters
 * @see {@link AuditLog} For the structure of audit log objects
 */
export function auditLogRegistry({ adapter, ...ctx }: RegistryContext) {
  const { createWithHooks } = getWithHooks(adapter, ctx);

  return {
    /**
     * Creates a new audit log entry in the database.
     *
     * This method records an action performed on an entity in the system,
     * capturing details such as what changed, who made the change, and when it occurred.
     * Automatically sets creation timestamp and applies any configured hooks during creation.
     *
     * @param auditLog - Audit log data to create (without id and timestamp)
     * @param auditLog.entityType - The type of entity being audited (e.g., 'consent', 'user')
     * @param auditLog.entityId - The unique identifier of the entity being audited
     * @param auditLog.actionType - The type of action performed (e.g., 'create', 'update', 'delete')
     * @param auditLog.subjectId - Identifier of the user/system that performed the action
     * @param auditLog.changes - Object describing the changes made to the entity
     * @param context - Optional endpoint context for hooks execution
     * @returns Promise resolving to the created audit log entry with all fields populated
     * @throws {Error} When the creation operation fails or returns null
     * @throws May also throw errors if hooks prevent creation or if database operations fail
     *
     * @example
     * ```ts
     * // Record a consent being withdrawn
     * const withdrawalLog = await registry.createAuditLog({
     *   entityType: 'consent',
     *   entityId: 'cns_abc123',
     *   actionType: 'update',
     *   subjectId: 'user_xyz789',
     *   changes: {
     *     status: { from: 'active', to: 'withdrawn' },
     *     withdrawalReason: { from: null, to: 'Changed mind' }
     *   }
     * });
     *
     * // Record a new policy being created
     * const policyCreationLog = await registry.createAuditLog({
     *   entityType: 'policy',
     *   entityId: 'pol_def456',
     *   actionType: 'create',
     *   subjectId: 'admin_uvw321',
     *   changes: null // No previous state for creation
     * });
     * ```
     *
     * @see {@link AuditLog} For the complete structure of the audit log object
     * @see {@link GenericEndpointContext} For details on the context object
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
        throw new DoubleTieError(
          'Failed to create audit log - operation returned null',
          {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            status: 500,
          }
        );
      }

      return createdLog as AuditLog;
    },
  };
}
