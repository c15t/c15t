/**
 * Client-side subject ID generation.
 *
 * @remarks
 * Generates time-ordered, base58-encoded identifiers that match the server format:
 * - Prefixed with `sub_` for clear identification
 * - 8 bytes for timestamp (time since epoch 1_700_000_000_000)
 * - 12 bytes of randomness for uniqueness
 * - Base58 encoded for URL-safe, compact representation
 *
 * @packageDocumentation
 */
/**
 * Generates a unique subject ID for client-side use.
 *
 * @remarks
 * The ID format matches the server-side generation:
 * - `sub_` prefix
 * - 8 bytes timestamp (milliseconds since custom epoch)
 * - 12 bytes random data
 * - Base58 encoded
 *
 * The timestamp component ensures chronological ordering,
 * while the random component ensures uniqueness even with
 * concurrent generation.
 *
 * @returns A unique subject ID in the format `sub_<base58>`
 *
 * @example
 * ```typescript
 * const subjectId = generateSubjectId();
 * // Returns something like: 'sub_2VZxR7YmNpKq3WfLs8TgHd'
 * ```
 *
 * @public
 */
export declare function generateSubjectId(): string;
/**
 * Validates that a string matches the expected subject ID format.
 *
 * @param id - The string to validate
 * @returns True if the string is a valid subject ID format
 *
 * @example
 * ```typescript
 * isValidSubjectId('sub_2VZxR7YmNpKq3WfLs8TgHd'); // true
 * isValidSubjectId('invalid'); // false
 * isValidSubjectId('cns_2VZxR7YmNpKq3WfLs8TgHd'); // false (wrong prefix)
 * ```
 *
 * @public
 */
export declare function isValidSubjectId(id: string): boolean;
