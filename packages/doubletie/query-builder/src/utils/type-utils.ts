/**
 * Utility to reduce depth of TypeScript's internal type instantiation stack.
 *
 * Example:
 *
 * ```ts
 * type A<T> = { item: T }
 *
 * type Test<T> = A<
 *   A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<T>>>>>>>>>>>>>>>>>>>>>>>>
 * >
 *
 * // type Error = Test<number> // Type instantiation is excessively deep and possibly infinite.ts (2589)
 * ```
 *
 * To fix this, we can use `DrainOuterGeneric`:
 *
 * ```ts
 * type A<T> = DrainOuterGeneric<{ item: T }>
 *
 * type Test<T> = A<
 *  A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<A<T>>>>>>>>>>>>>>>>>>>>>>>>
 * >
 *
 * type Ok = Test<number> // Ok
 * ```
 */
export type DrainOuterGeneric<T> = [T] extends [unknown] ? T : never;

/**
 * Makes all properties in T optional recursively
 *
 * @example
 * ```ts
 * type User = {
 *   name: string;
 *   address: {
 *     street: string;
 *     city: string;
 *   }
 * }
 *
 * type PartialUser = DeepPartial<User>;
 * // {
 * //   name?: string;
 * //   address?: {
 * //     street?: string;
 * //     city?: string;
 * //   }
 * // }
 * ```
 */
export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
		}
	: T;

/**
 * Makes specific properties in T required
 *
 * @example
 * ```ts
 * type User = {
 *   id?: number;
 *   name?: string;
 *   email?: string;
 * }
 *
 * type CreateUser = RequiredBy<User, 'name' | 'email'>;
 * // {
 * //   id?: number;
 * //   name: string;
 * //   email: string;
 * // }
 * ```
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
	Required<Pick<T, K>>;

/**
 * Creates a type that requires at least one of the properties in T
 *
 * @example
 * ```ts
 * type SearchParams = AtLeastOne<{
 *   name: string;
 *   email: string;
 *   phone: string;
 * }>;
 *
 * // Must provide at least one of name, email, or phone
 * const search: SearchParams = { name: 'John' }; // OK
 * const invalid: SearchParams = {}; // Error
 * ```
 */
export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
	U[keyof U];

export type ShallowRecord<K extends keyof any, T> = DrainOuterGeneric<{
	[P in K]: T;
}>;
