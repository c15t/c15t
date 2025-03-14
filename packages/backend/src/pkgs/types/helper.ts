/**
 * Represents a string literal type
 *
 * This type ensures that only string literals are accepted, not general string types.
 * It's useful for ensuring type safety with specific string values.
 *
 * @example
 * ```ts
 * // Function that only accepts literal strings, not string variables
 * function doSomething(value: LiteralString) {
 *   // Implementation
 * }
 *
 * // Valid usage:
 * doSomething('specific-value');
 *
 * // Invalid usage:
 * const dynamicString = getStringFromSomewhere();
 * doSomething(dynamicString); // Type error
 * ```
 */
export type LiteralString = '' | (string & Record<never, never>);

/**
 * Extracts all required keys from an object type
 *
 * This utility type identifies which keys in an object type are required
 * (not optional or undefined). Useful for type manipulation in complex types.
 *
 * @typeParam BaseType - The object type to extract required keys from
 *
 * @example
 * ```ts
 * interface User {
 *   id: string;
 *   name: string;
 *   email?: string;
 *   phone?: number;
 * }
 *
 * // RequiredKeys will be 'id' | 'name'
 * type RequiredKeys = RequiredKeysOf<User>;
 * ```
 */
export type RequiredKeysOf<BaseType extends object> = Exclude<
	{
		[Key in keyof BaseType]: BaseType extends Record<Key, BaseType[Key]>
			? Key
			: never;
	}[keyof BaseType],
	undefined
>;

/**
 * Makes all properties in an object optional recursively
 *
 * This is like TypeScript's built-in Partial<T>, but it goes deeper into
 * nested objects to make their properties optional too.
 *
 * @typeParam T - The type to make deeply partial
 *
 * @example
 * ```ts
 * interface User {
 *   id: string;
 *   name: string;
 *   settings: {
 *     theme: string;
 *     notifications: boolean;
 *   }
 * }
 *
 * // All properties are optional, including nested ones
 * const partialUser: DeepPartial<User> = {
 *   name: 'Alice',
 *   settings: {
 *     theme: 'dark'
 *     // notifications is optional
 *   }
 * };
 * ```
 */
export type DeepPartial<T> = T extends (...args: unknown[]) => unknown
	? T
	: T extends object
		? { [K in keyof T]?: DeepPartial<T[K]> }
		: T;

/**
 * Expands object types recursively for better IDE type information
 *
 * This utility type improves TypeScript's display of complex nested types
 * by expanding them into their constituent parts.
 *
 * @typeParam T - The type to expand recursively
 */
export type ExpandRecursively<T> = T extends infer O
	? { [K in keyof O]: O[K] }
	: never;
