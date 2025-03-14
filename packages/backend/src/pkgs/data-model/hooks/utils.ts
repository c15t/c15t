import type { EntityName, EntityTypeMap } from '~/pkgs/data-model/schema/types';
import type { GenericEndpointContext } from '~/pkgs/types';
import type { DatabaseHook, HookOperation, HookPhase } from './types';

/**
 * Process hooks for a given phase and operation.
 *
 * @typeParam TEntityData - Type of the entity data being processed
 *
 * @param data - The data to process through hooks
 * @param model - The entity type/model name
 * @param operation - The operation being performed (create/update)
 * @param phase - The hook execution phase (before/after)
 * @param hooks - Array of hook sets to process
 * @param context - Optional request context
 * @returns The processed data, potentially transformed, or null if aborted
 *
 * @remarks
 * This core utility function handles the execution of hooks for various
 * database operations. It traverses all registered hooks for the specified
 * entity, operation, and phase, applying transformations or aborting as needed.
 *
 * @example
 * ```typescript
 * const processedData = await processHooks(
 *   { name: 'Alice' },
 *   'subject',
 *   'create',
 *   'before',
 *   registeredHooks
 * );
 * ```
 */
export async function processHooks<
	TEntityName extends EntityName,
	TEntityData extends Record<string, unknown>,
>(
	data: TEntityData,
	model: TEntityName,
	operation: HookOperation,
	phase: HookPhase,
	hooks: DatabaseHook[],
	context?: GenericEndpointContext
): Promise<TEntityData | null> {
	let currentData = { ...data };

	for (const hookSet of hooks) {
		// Skip if no hooks for this model
		const modelHooks = hookSet[model];
		if (!modelHooks) {
			continue;
		}

		// Skip if no hooks for this operation
		const operationHooks = modelHooks[operation];
		if (!operationHooks) {
			continue;
		}

		// Skip if no hooks for this phase
		const hookFn = operationHooks[phase];
		if (!hookFn) {
			continue;
		}

		if (phase === 'before') {
			const result = await hookFn(
				currentData as unknown as EntityTypeMap[TEntityName],
				context
			);

			if (result && typeof result === 'object' && 'kind' in result) {
				switch (result.kind) {
					case 'abort':
						return null;
					case 'transform': {
						const transformData = result.data;
						currentData = {
							...currentData,
							...transformData,
						};
						break;
					}
					default:
						// Continue with current data
						break;
				}
			}
		} else {
			// For 'after' hooks, we use the same type casting approach
			await hookFn(
				currentData as unknown as EntityTypeMap[TEntityName],
				context
			);
		}
	}

	return currentData;
}

/**
 * Process hooks for multiple records.
 *
 * @typeParam TEntityName - Type of the entity name
 * @typeParam TEntityData - Type of the entity data
 *
 * @param records - Array of records to process
 * @param model - The entity type/model name
 * @param hooks - Array of hook sets to process
 * @param context - Optional request context
 * @returns Promise that resolves when all hooks have been processed
 *
 * @remarks
 * This utility function handles processing after-update hooks for a batch
 * of records, ensuring each record goes through the appropriate hooks.
 *
 * @example
 * ```typescript
 * // Process 'after update' hooks for multiple subjects
 * await processAfterHooksForMany(
 *   updatedSubjects,
 *   'subject',
 *   registeredHooks,
 *   { batchId: 'sub_x1pftyoufsm7xgo1kv' }
 * );
 * ```
 */
export async function processAfterHooksForMany<
	TEntityName extends EntityName,
	TEntityData extends Record<string, unknown>,
>(
	records: TEntityData[],
	model: TEntityName,
	hooks: DatabaseHook[],
	context?: GenericEndpointContext
): Promise<void> {
	if (!records.length) {
		return;
	}

	for (const record of records) {
		await processHooks<TEntityName, TEntityData>(
			record,
			model,
			'update',
			'after',
			hooks,
			context
		);
	}
}
