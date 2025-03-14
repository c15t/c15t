import type { EntityName } from '~/pkgs/data-model/schema/types';
import type { Adapter } from '~/pkgs/db-adapters';
import type { CreateWithHooksProps, HookContext } from './types';
import { processHooks } from './utils';

/**
 * Creates a record with hooks applied before and after creation.
 *
 * @typeParam TInputData - Type of the data being created
 * @typeParam TOutputData - Type of the data returned after creation
 *
 * @param adapter - The database adapter to use
 * @param ctx - Context containing hooks and options
 * @param props - Properties for the create operation
 * @returns The created record or null if a hook aborted the operation
 *
 * @remarks
 * This function orchestrates the entity creation process, executing hooks
 * at appropriate times to allow validation, transformation, and post-processing.
 * It supports both standard adapter-based creation and custom creation functions.
 *
 * @example
 * ```typescript
 * const subject = await createWithHooks(
 *   mysqlAdapter,
 *   { hooks: subjectHooks, options: config },
 *   {
 *     data: { name: 'Alice' },
 *     model: 'subject'
 *   }
 * );
 * ```
 */
export async function createWithHooks<
	TInputData extends Record<string, unknown> = Record<string, unknown>,
	TOutputData extends Record<string, unknown> = TInputData,
>(
	adapter: Adapter,
	ctx: HookContext,
	props: CreateWithHooksProps<TInputData>
): Promise<TOutputData | null> {
	const { data, model, customFn, context } = props;
	const hooks = ctx.hooks || [];

	// Process before hooks
	const transformedData = await processHooks<EntityName, TInputData>(
		data,
		model,
		'create',
		'before',
		hooks,
		context
	);
	if (transformedData === null) {
		return null;
	}

	// Execute operation
	let created: TOutputData | null = null;

	if (customFn) {
		created = (await customFn.fn(transformedData)) as TOutputData | null;
		if (!customFn.executeMainFn && created) {
			return created;
		}
	}

	if (!created) {
		created = (await adapter.create({
			model: model as EntityName,
			data: transformedData,
		})) as unknown as TOutputData;
	}

	// Process after hooks
	if (created) {
		await processHooks<EntityName, TOutputData>(
			created,
			model,
			'create',
			'after',
			hooks,
			context
		);
	}

	return created;
}
