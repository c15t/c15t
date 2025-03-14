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
