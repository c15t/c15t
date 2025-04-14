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
