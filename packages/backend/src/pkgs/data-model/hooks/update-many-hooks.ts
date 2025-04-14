import type { EntityName } from '~/pkgs/data-model';
import type { Adapter } from '~/pkgs/db-adapters';
import type {
	CustomOperationFunction,
	HookContext,
	UpdateWithHooksProps,
} from './types';
import { processAfterHooksForMany, processHooks } from './utils';

/**
 * Executes a custom function if provided for batch updates.
 *
 * This internal helper handles custom function execution and determines
 * whether the standard update operation should also be performed.
 *
 * @template TInputData - Type of the input data
 * @template TOutputData - Type of the output data
 *
 * @param data - The data to process
 * @param customFn - Optional custom function to execute
 *
 * @returns Object containing the result and whether to continue with standard update
 */
async function executeCustomFunction<
	TInputData extends Record<string, unknown>,
	TOutputData,
>(
	data: TInputData,
	customFn?: CustomOperationFunction<Partial<TInputData>, TOutputData>
): Promise<{ result: TOutputData | null; shouldContinue: boolean }> {
	if (!customFn) {
		return { result: null, shouldContinue: true };
	}
	const result = (await customFn.fn(
		data as unknown as TOutputData
	)) as TOutputData | null;
	const shouldContinue = !result || !!customFn.executeMainFn;

	return { result, shouldContinue };
}

/**
 * Processes the result from updateMany adapter operations.
 *
 * This internal helper normalizes various result formats that may be
 * returned by different adapters when performing batch updates.
 *
 * @template TEntityData - The entity data type
 *
 * @param result - The raw result from the adapter
 * @returns Normalized array of entity data or null
 */
function processUpdateManyResult<TEntityData extends Record<string, unknown>>(
	result: unknown
): TEntityData[] | null {
	if (Array.isArray(result)) {
		return result;
	}

	if (typeof result === 'number' && result > 0) {
		return []; // Empty array if we just got a count
	}

	return null;
}

/**
 * Updates multiple records with hooks applied before and after the batch update.
 *
 * This function orchestrates the batch update process, executing hooks
 * at appropriate times to allow validation, transformation, and post-processing
 * for multiple records simultaneously.
 *
 * @template TInputData - Type of the data being updated
 * @template TOutputData - Type of the data returned after update
 *
 * @param adapter - The database adapter to use
 * @param ctx - Context containing hooks and options
 * @param props - Properties for the updateMany operation
 *
 * @returns The updated records or null if a hook aborted the operation
 *
 * @example
 * ```typescript
 * // Batch update subjects
 * const updatedSubjects = await updateManyWithHooks(
 *   mysqlAdapter,
 *   { hooks: subjectHooks, options: config },
 *   {
 *     data: { isVerified: true },
 *     where: { emailDomain: 'example.com' },
 *     model: 'subject'
 *   }
 * );
 *
 * // With custom function for complex batch processing
 * const updatedPosts = await updateManyWithHooks(
 *   mysqlAdapter,
 *   { hooks: postHooks, options: config },
 *   {
 *     data: { isArchived: true },
 *     where: { createdAt: { lt: oneYearAgo } },
 *     model: 'post',
 *     customFn: {
 *       fn: async (data) => {
 *         // Get posts to be archived
 *         const postsToArchive = await postService.findOldPosts();
 *         // Custom batch processing
 *         const archivedPosts = await postService.batchArchive(postsToArchive, data);
 *         return archivedPosts;
 *       },
 *       executeMainFn: false // Skip standard update as custom function handles it
 *     }
 *   }
 * );
 * ```
 */
export async function updateManyWithHooks<
	TInputData extends Record<string, unknown> = Record<string, unknown>,
	TOutputData extends Record<string, unknown> = TInputData,
>(
	adapter: Adapter,
	ctx: HookContext,
	props: UpdateWithHooksProps<TInputData, TOutputData>
): Promise<TOutputData[] | null> {
	const { data, where, model, customFn, context } = props;
	const hooks = ctx.hooks || [];

	// Process before hooks
	const transformedData = await processHooks<EntityName, Partial<TInputData>>(
		data,
		model,
		'update',
		'before',
		hooks,
		context
	);
	if (transformedData === null) {
		return null;
	}

	// Try custom function first
	const { result: customResult, shouldContinue } = await executeCustomFunction<
		Partial<TInputData>,
		TOutputData[]
		//@ts-expect-error
	>(transformedData, customFn);

	if (customResult && !shouldContinue) {
		return customResult;
	}

	// Use adapter if needed
	let updated = customResult;
	if (!updated) {
		const adapterResult = await adapter.updateMany({
			model: model as EntityName,
			update: transformedData,
			where,
		});

		updated = processUpdateManyResult<TOutputData>(adapterResult);
	}

	// Process after hooks
	if (updated && updated.length > 0) {
		await processAfterHooksForMany<EntityName, TOutputData>(
			updated,
			model,
			hooks,
			context
		);
	}

	return updated;
}
