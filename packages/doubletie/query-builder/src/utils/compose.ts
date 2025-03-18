/**
 * Utility functions for functional composition
 *
 * @module compose
 */

/**
 * Composes multiple functions together, applying them from right to left
 *
 * @typeParam TResult - Result type
 * @param fns - Functions to compose
 * @returns Composed function
 */
export function compose<TResult>(
	...fns: Array<(arg: any) => any>
): (arg: any) => TResult {
	return (value: any) => fns.reduceRight((acc, fn) => fn(acc), value);
}

/**
 * Pipes a value through multiple functions, applying them from left to right
 *
 * This version handles progressive type transformations through the pipeline
 *
 * @typeParam TInputType - Initial input type
 * @typeParam TResult - Result type
 * @returns Piped function
 */
export function pipe<TInputType, TResult>(
	fn1: (input: TInputType) => TResult
): (input: TInputType) => TResult;
export function pipe<TInputType, T2, TResult>(
	fn1: (input: TInputType) => T2,
	fn2: (input: T2) => TResult
): (input: TInputType) => TResult;
export function pipe<TInputType, T2, T3, TResult>(
	fn1: (input: TInputType) => T2,
	fn2: (input: T2) => T3,
	fn3: (input: T3) => TResult
): (input: TInputType) => TResult;
export function pipe<TInputType, T2, T3, T4, TResult>(
	fn1: (input: TInputType) => T2,
	fn2: (input: T2) => T3,
	fn3: (input: T3) => T4,
	fn4: (input: T4) => TResult
): (input: TInputType) => TResult;
export function pipe<TInputType, T2, T3, T4, T5, TResult>(
	fn1: (input: TInputType) => T2,
	fn2: (input: T2) => T3,
	fn3: (input: T3) => T4,
	fn4: (input: T4) => T5,
	fn5: (input: T5) => TResult
): (input: TInputType) => TResult;
export function pipe<TInputType, T2, T3, T4, T5, T6, TResult>(
	fn1: (input: TInputType) => T2,
	fn2: (input: T2) => T3,
	fn3: (input: T3) => T4,
	fn4: (input: T4) => T5,
	fn5: (input: T5) => T6,
	fn6: (input: T6) => TResult
): (input: TInputType) => TResult;

/**
 * Generic pipe implementation that handles variable numbers of functions
 */
export function pipe(...fns: Array<(arg: any) => any>): (arg: any) => any {
	return (value: any) => fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Example of how to use with model mixins:
 *
 * ```typescript
 * import { pipe } from './compose';
 * import { createModel } from '../model';
 * import withUpdatedAt from '../mixins/updatedAt';
 * import withSlug from '../mixins/slug';
 *
 * const db = new Database<MyDB>({ ... });
 *
 * const UserModel = pipe(
 *   createModel(db, 'users', 'id'),
 *   (model) => withUpdatedAt(model, 'updatedAt'),
 *   (model) => withSlug(model)({ field: 'slug', sources: ['name'] })
 * );
 * ```
 */
