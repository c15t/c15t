import type { EntityName, EntityTypeMap } from '~/pkgs/data-model';
import type { Where } from '~/pkgs/db-adapters';
import type { C15TOptions, GenericEndpointContext } from '~/pkgs/types';

/**
 * Defines execution phases when hooks can run in the database operation lifecycle.
 */
export type HookPhase = 'before' | 'after';

/**
 * Defines database operations that can have hooks attached.
 */
export type HookOperation = 'create' | 'update';

/**
 * Result types for hook execution that control the flow of operations.
 *
 * @typeParam TData - The data type being processed by the hook
 *
 * @remarks
 * Hook functions can return different result types to control operation flow:
 * - `{ kind: 'abort' }` - Abort the operation entirely
 * - `{ kind: 'transform', data: TData }` - Transform the data and continue
 * - `{ kind: 'continue' }` - Continue with unchanged data
 *
 * @example
 * ```typescript
 * // Abort if validation fails
 * if (!isValid(data)) {
 *   return { kind: 'abort' };
 * }
 * ```
 */
export type HookResult<TData> =
	| { kind: 'abort' }
	| { kind: 'transform'; data: TData }
	| { kind: 'continue' };

/**
 * Hook function for a specific entity type, providing before/after hooks
 * for create and update operations.
 *
 * @typeParam TEntityName - The entity type this hook applies to
 *
 * @remarks
 * ModelHook provides a structured way to define hooks for different
 * database operations on a specific entity type.
 *
 * @example
 * ```typescript
 * const subjectHook: ModelHook<'subject'> = {
 *   create: {
 *     before: (subjectData) => ({
 *       kind: 'transform',
 *       data: { ...subjectData, createdAt: new Date() }
 *     })
 *   }
 * };
 * ```
 */
export interface ModelHook<TEntityName extends EntityName = EntityName> {
	create?: {
		before?: (
			data: EntityTypeMap[TEntityName],
			context?: GenericEndpointContext
		) =>
			| Promise<HookResult<EntityTypeMap[TEntityName]> | undefined>
			| HookResult<EntityTypeMap[TEntityName]>
			| undefined;
		after?: (
			data: EntityTypeMap[TEntityName],
			context?: GenericEndpointContext
		) => Promise<void> | void;
	};
	update?: {
		before?: (
			data: Partial<EntityTypeMap[TEntityName]>,
			context?: GenericEndpointContext
		) =>
			| Promise<HookResult<Partial<EntityTypeMap[TEntityName]>> | undefined>
			| HookResult<Partial<EntityTypeMap[TEntityName]>>
			| undefined;
		after?: (
			data: EntityTypeMap[TEntityName],
			context?: GenericEndpointContext
		) => Promise<void> | void;
	};
}

/**
 * A collection of hooks for different entity types in the database.
 *
 * @remarks
 * This is the primary way to register hooks in the system.
 */
export type DatabaseHook = {
	[TEntityName in EntityName]?: ModelHook<TEntityName>;
};

/**
 * Context object containing application options and registered hooks.
 */
export interface HookContext {
	hooks: DatabaseHook[];
	options: C15TOptions;
}

/**
 * Interface for defining custom operation functions that can be used
 * in place of or alongside standard database operations.
 *
 * @typeParam TInputData - The input data type for the operation
 * @typeParam TOutputData - The output data type for the operation
 *
 * @remarks
 * Custom functions allow for specialized behavior when standard
 * CRUD operations aren't sufficient.
 */
export interface CustomOperationFunction<
	TInputData extends Record<string, unknown> = Record<string, unknown>,
	TOutputData = TInputData,
> {
	fn: (data: TOutputData) => Promise<TOutputData | null> | TOutputData | null;
	executeMainFn?: boolean;
}

/**
 * Properties for creating a record with hooks.
 *
 * @typeParam TData - The data type being created
 *
 * @remarks
 * This is the parameter object for the createWithHooks function.
 */
export interface CreateWithHooksProps<
	TData extends Record<string, unknown> = Record<string, unknown>,
> {
	data: TData;
	model: EntityName;
	customFn?: CustomOperationFunction<TData>;
	context?: GenericEndpointContext;
}

/**
 * Properties for updating records with hooks.
 *
 * @typeParam TInputData - The input data type for the update
 * @typeParam TOutputData - The expected output data type
 * @typeParam TResultData - The final result data type
 *
 * @remarks
 * This is the parameter object for updateWithHooks and updateManyWithHooks functions.
 */
export interface UpdateWithHooksProps<
	TInputData extends Record<string, unknown> = Record<string, unknown>,
	TOutputData = TInputData,
	TResultData = TOutputData,
> {
	data: Partial<TInputData>;
	where: Where<EntityName>;
	model: EntityName;
	customFn?: CustomOperationFunction<Partial<TInputData>, TResultData>;
	context?: GenericEndpointContext;
}
