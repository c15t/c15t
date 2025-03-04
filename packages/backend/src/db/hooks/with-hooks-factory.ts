import type { Adapter } from '~/db/adapters/types';
import type {
	CreateWithHooksProps,
	HookContext,
	UpdateWithHooksProps,
} from './types';
import { createWithHook } from './create-hooks';
import { updateWithHooks } from './update-hooks';
import { updateManyWithHooks } from './update-many-hooks';

/**
 * Creates a set of functions that apply hooks before and after database operations.
 *
 * @param adapter - The database adapter to use for operations
 * @param ctx - Context object containing options and hooks
 * @returns Object with hook-enabled database operation functions
 *
 * @remarks
 * This factory function generates hook-enabled versions of common database operations
 * (create, update, updateMany), allowing for consistent hook processing across
 * the application.
 *
 * @example
 * ```typescript
 * const { createWithHooks } = getWithHooks(adapter, {
 *   options: c15tOptions,
 *   hooks: c15tOptions.databaseHooks || []
 * });
 *
 * const user = await createWithHooks({
 *   data: { name: 'Alice' },
 *   model: 'user'
 * });
 * ```
 */
export function getWithHooks(adapter: Adapter, ctx: HookContext) {
	return {
		createWithHooks: <
			TInputData extends Record<string, unknown>,
			TOutputData extends Record<string, unknown> = TInputData,
		>({
			data,
			model,
			customFn,
			context,
		}: CreateWithHooksProps<TInputData>) =>
			createWithHook<TInputData, TOutputData>(adapter, ctx, {
				data,
				model,
				customFn,
				context,
			}),

		updateWithHooks: <
			TInputData extends Record<string, unknown>,
			TOutputData extends Record<string, unknown> = TInputData,
		>(
			props: UpdateWithHooksProps<TInputData, TOutputData>
		) => updateWithHooks<TInputData, TOutputData>(adapter, ctx, props),

		updateManyWithHooks: <
			TInputData extends Record<string, unknown>,
			TOutputData extends Record<string, unknown> = TInputData,
		>(
			props: UpdateWithHooksProps<TInputData, TOutputData>
		) => updateManyWithHooks<TInputData, TOutputData>(adapter, ctx, props),
	};
}
