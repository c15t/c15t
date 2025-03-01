import type { Adapter } from '~/types';
import type { HookContext, UpdateWithHooksProps } from './types';
import { processHooks } from './utils';
import type { EntityName } from '../core/types';

/**
 * Updates a record with hooks applied before and after the update operation.
 *
 * @typeParam TInputData - Type of the data being updated
 * @typeParam TOutputData - Type of the data returned after update
 *
 * @param adapter - The database adapter to use
 * @param ctx - Context containing hooks and options
 * @param props - Properties for the update operation
 * @returns The updated record or null if a hook aborted the operation
 *
 * @remarks
 * This function orchestrates the entity update process, executing hooks
 * at appropriate times to allow validation, transformation, and post-processing.
 * It supports both standard adapter-based updates and custom update functions.
 *
 * @example
 * ```typescript
 * const updatedUser = await updateWithHooks(
 *   mysqlAdapter,
 *   { hooks: userHooks, options: config },
 *   {
 *     data: { status: 'active' },
 *     where: { id: 'user-123' },
 *     model: 'user'
 *   }
 * );
 * ```
 */
export async function updateWithHooks<
	TInputData extends Record<string, unknown> = Record<string, unknown>,
	TOutputData extends Record<string, unknown> = TInputData,
>(
	adapter: Adapter,
	ctx: HookContext,
	props: UpdateWithHooksProps<TInputData, TOutputData>
): Promise<TOutputData | null> {
	const { data, where, model, customFn, context } = props;
	const hooks = ctx.hooks || [];

	// Process before hooks
	const transformedData = await processHooks<Partial<TInputData>>(
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

	// Execute operation
	let updated: TOutputData | null = null;
	if (customFn) {
		const result = await customFn.fn(transformedData as TOutputData);
		updated = result;
		if (!customFn.executeMainFn && updated) {
			return updated;
		}
	}

	if (!updated) {
		updated = (await adapter.update({
			model: model as EntityName,
			update: transformedData,
			where,
		})) as TOutputData | null;
	}

	// Process after hooks
	if (updated) {
		await processHooks<TOutputData>(
			updated,
			model,
			'update',
			'after',
			hooks,
			context
		);
	}

	return updated;
}
