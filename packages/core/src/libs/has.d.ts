import type { AllConsentNames, ConsentState } from '../types';
/**
 * Defines a flexible condition system for checking consent states.
 *
 * @typeParam CategoryType - The type of consent categories being evaluated
 *
 * @remarks
 * This type supports complex logical operations for consent checking:
 * - Simple category matching: `"measurement"`
 * - Logical AND operations: `{ and: ["measurement", "marketing"] }`
 * - Logical OR operations: `{ or: ["measurement", "marketing"] }`
 * - Logical NOT operations: `{ not: "measurement" }` or `{ not: { and: [...] } }`
 *
 * Conditions can be nested arbitrarily deep, allowing for complex consent logic.
 *
 * @example
 * ```typescript
 * // Simple category check
 * const simpleCondition: HasCondition<AllConsentNames> = "measurement";
 *
 * // Complex nested condition
 * const complexCondition: HasCondition<AllConsentNames> = {
 *   and: [
 *     "necessary",
 *     { or: ["measurement", "marketing"] },
 *     { not: "functionality" }
 *   ]
 * };
 * ```
 *
 * @public
 */
export type HasCondition<CategoryType> =
	| CategoryType
	| {
			and: HasCondition<CategoryType> | HasCondition<CategoryType>[];
	  }
	| {
			or: HasCondition<CategoryType> | HasCondition<CategoryType>[];
	  }
	| {
			not: HasCondition<CategoryType>;
	  };
/**
 * Optional runtime policy options for consent evaluation.
 *
 * @public
 */
export interface HasOptions {
	/**
	 * Allowed categories from the active policy.
	 */
	policyCategories?: string[] | null;
	/**
	 * Runtime scope handling for out-of-policy categories.
	 */
	policyScopeMode?: 'strict' | 'permissive' | null;
}
/**
 * Evaluates whether current consent state satisfies the given condition.
 *
 * @typeParam CategoryType - The type of consent categories (typically AllConsentNames)
 *
 * @param condition - The consent condition to evaluate
 * @param consents - Current state of user consents
 * @param options - Configuration options for evaluation behavior
 *
 * @returns True if the consent condition is satisfied, false otherwise
 *
 * @throws {TypeError} When condition has invalid structure
 * @throws {Error} When required consent categories are missing from consent state
 *
 * @remarks
 * This function provides a powerful way to check complex consent requirements:
 *
 * **Simple Usage:**
 * - Check single consent: `has("measurement", consents)`
 *
 * **Complex Conditions:**
 * - AND logic: `has({ and: ["measurement", "marketing"] }, consents)`
 * - OR logic: `has({ or: ["measurement", "marketing"] }, consents)`
 * - NOT logic: `has({ not: "measurement" }, consents)`
 * - Nested logic: `has({ and: ["necessary", { or: ["measurement", "marketing"] }] }, consents)`
 *
 * @example
 * ```typescript
 * const consents: ConsentState = {
 *   necessary: true,
 *   measurement: true,
 *   marketing: false,
 *   functionality: false,
 *   experience: false
 * };
 *
 * // Simple checks
 * has("measurement", consents); // true
 * has("marketing", consents); // false
 *
 * // Complex logic
 * has({ and: ["necessary", "measurement"] }, consents); // true
 * has({ or: ["measurement", "marketing"] }, consents); // true
 * has({ not: "marketing" }, consents); // true
 *
 * // Nested conditions
 * has({
 *   and: [
 *     "necessary",
 *     { or: ["measurement", "marketing"] },
 *     { not: "functionality" }
 *   ]
 * }, consents); // true
 * ```
 *
 * @see {@link HasCondition} for condition structure details
 *
 * @public
 */
export declare function has<CategoryType extends AllConsentNames>(
	condition: HasCondition<CategoryType>,
	consents: ConsentState,
	options?: HasOptions
): boolean;
/**
 * Extracts all consent category names from a {@link HasCondition}.
 *
 * @typeParam CategoryType - The type of consent categories
 * @param condition - The condition to extract categories from
 * @returns An array of unique consent category names
 * @public
 */
export declare function extractConsentNamesFromCondition<
	CategoryType extends AllConsentNames,
>(condition: HasCondition<CategoryType>): CategoryType[];
