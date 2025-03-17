/**
 * Constant metadata flag to identify non-action objects
 *
 * This constant provides metadata that can be attached to objects to indicate
 * they should not be treated as actions by the system. The value is explicitly
 * typed as a const assertion to ensure type safety.
 *
 * @see Used to differentiate between actionable and non-actionable objects in the system
 *
 * @example
 * ```ts
 * // Mark an object as not being an action
 * const nonActionObject = {
 *   ...HIDE_METADATA,
 *   // other properties
 * };
 * ```
 */
export const HIDE_METADATA = {
	isAction: false as const,
};

/**
 * Adds metadata to an object to mark it as a non-action
 *
 * This utility function adds the isAction: false metadata to any object,
 * making it easier to mark objects that should not be treated as actions
 * by the system.
 *
 * @param obj - The object to add metadata to
 * @returns A new object with the added metadata
 *
 * @example
 * ```ts
 * // Mark an object as not being an action
 * const nonActionObject = hideMetadata({
 *   name: 'example',
 *   value: 123
 * });
 * // Result: { name: 'example', value: 123, isAction: false }
 * ```
 */
export function hideMetadata<T extends object>(
	obj: T
): T & { isAction: false } {
	return {
		...obj,
		isAction: false,
	};
}
