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
	| CategoryType // e.g., "measurement"
	| { and: HasCondition<CategoryType> | HasCondition<CategoryType>[] } // e.g., { and: ["measurement", "marketing"] }
	| { or: HasCondition<CategoryType> | HasCondition<CategoryType>[] } // e.g., { or: ["measurement", "marketing"] }
	| { not: HasCondition<CategoryType> }; // e.g., { not: "measurement" }, { not: { and: ["measurement", "marketing"] } }

/**
 * Validates that a condition array is not empty.
 *
 * @param conditions - Array of conditions to validate
 * @param conditionType - Type of condition for error message
 *
 * @throws {TypeError} When the condition array is empty
 *
 * @internal
 */
function validateNonEmptyConditions<CategoryType>(
	conditions: CategoryType[] | HasCondition<CategoryType>[],
	conditionType: string
): void {
	if (conditions.length === 0) {
		throw new TypeError(`${conditionType} condition cannot be empty`);
	}
}

/**
 * Evaluates a simple category consent condition.
 *
 * @param category - The consent category to check
 * @param consents - The current consent state
 * @returns True if consent is granted for the category
 *
 * @throws {Error} When consent category is not found in consent state
 *
 * @internal
 */
function evaluateCategoryCondition(
	category: AllConsentNames,
	consents: ConsentState
): boolean {
	if (!(category in consents)) {
		throw new Error(
			`Consent category "${category}" not found in consent state`
		);
	}
	return consents[category] || false;
}

/**
 * Evaluates an AND logic condition.
 *
 * @param andCondition - The AND condition to evaluate (can be a single condition or array of conditions)
 * @param consents - The current consent state
 * @returns True if all sub-conditions are satisfied
 *
 * @throws {TypeError} When AND condition is empty
 *
 * @internal
 */
function evaluateAndCondition<CategoryType extends AllConsentNames>(
	andCondition: HasCondition<CategoryType> | HasCondition<CategoryType>[],
	consents: ConsentState
): boolean {
	const andConditions = Array.isArray(andCondition)
		? andCondition
		: [andCondition];
	validateNonEmptyConditions(andConditions, 'AND');
	return andConditions.every((subCondition) =>
		evaluateConditionRecursive(subCondition, consents)
	);
}

/**
 * Evaluates an OR logic condition.
 *
 * @param orCondition - The OR condition to evaluate (can be a single condition or array of conditions)
 * @param consents - The current consent state
 * @returns True if any sub-condition is satisfied
 *
 * @throws {TypeError} When OR condition is empty
 *
 * @internal
 */
function evaluateOrCondition<CategoryType extends AllConsentNames>(
	orCondition: HasCondition<CategoryType> | HasCondition<CategoryType>[],
	consents: ConsentState
): boolean {
	const orConditions = Array.isArray(orCondition) ? orCondition : [orCondition];
	validateNonEmptyConditions(orConditions, 'OR');
	return orConditions.some((subCondition) =>
		evaluateConditionRecursive(subCondition, consents)
	);
}

/**
 * Recursively evaluates consent conditions.
 *
 * @param condition - The condition to evaluate
 * @param consents - The current consent state
 * @returns Boolean result of the condition evaluation
 *
 * @throws {TypeError} When condition structure is invalid
 * @throws {Error} When consent category is not found in consent state
 *
 * @internal
 */
function evaluateConditionRecursive<CategoryType extends AllConsentNames>(
	condition: HasCondition<CategoryType>,
	consents: ConsentState
): boolean {
	// Handle simple category string
	if (typeof condition === 'string') {
		return evaluateCategoryCondition(condition, consents);
	}

	// Handle object conditions
	if (typeof condition === 'object' && condition !== null) {
		// Handle AND condition
		if ('and' in condition) {
			return evaluateAndCondition(condition.and, consents);
		}

		// Handle OR condition
		if ('or' in condition) {
			return evaluateOrCondition(condition.or, consents);
		}

		// Handle NOT condition
		if ('not' in condition) {
			return !evaluateConditionRecursive(condition.not, consents);
		}
	}

	throw new TypeError(
		`Invalid condition structure: ${JSON.stringify(condition)}`
	);
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
export function has<CategoryType extends AllConsentNames>(
	condition: HasCondition<CategoryType>,
	consents: ConsentState
): boolean {
	return evaluateConditionRecursive(condition, consents);
}

/**
 * Extracts all consent category names from a {@link HasCondition}.
 *
 * @typeParam CategoryType - The type of consent categories
 * @param condition - The condition to extract categories from
 * @returns An array of unique consent category names
 * @public
 */
export function extractConsentNamesFromCondition<
	CategoryType extends AllConsentNames,
>(condition: HasCondition<CategoryType>): CategoryType[] {
	const categories = new Set<CategoryType>();

	function recurse(cond: HasCondition<CategoryType>) {
		if (typeof cond === 'string') {
			categories.add(cond);
			return;
		}

		if (typeof cond === 'object' && cond !== null) {
			if ('and' in cond) {
				const conditions = Array.isArray(cond.and) ? cond.and : [cond.and];
				conditions.forEach(recurse);
			} else if ('or' in cond) {
				const conditions = Array.isArray(cond.or) ? cond.or : [cond.or];
				conditions.forEach(recurse);
			} else if ('not' in cond) {
				recurse(cond.not);
			}
		}
	}

	recurse(condition);
	return Array.from(categories);
}
