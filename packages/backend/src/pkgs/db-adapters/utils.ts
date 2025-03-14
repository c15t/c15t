import type { Field, Primitive } from '~/db/core/fields/field-types';

/**
 * Applies the default value of a field if the provided value is undefined or null.
 * Used in create and update operations to handle default values consistently.
 *
 * @typeParam PrimitiveValue - The primitive type of the field value
 * @param inputValue - The input value provided for the field (may be undefined/null)
 * @param field - The field definition containing the default value
 * @param operation - The database operation being performed ('create' or 'update')
 * @returns The original value, or the default value if applicable
 *
 * @remarks
 * Default values are only applied:
 * 1. During 'create' operations (not during updates)
 * 2. When the input value is undefined or null
 * 3. When the field has a defaultValue defined
 *
 * If the defaultValue is a function, it will be called to generate the value.
 * This allows for dynamic default values such as timestamps, UUIDs, or any
 * other values that need to be computed at runtime.
 *
 * @example
 * ```typescript
 * // Field with static default
 * const nameField = { type: 'string', defaultValue: 'Anonymous' };
 * applyDefaultValue(undefined, nameField, 'create'); // 'Anonymous'
 * applyDefaultValue('Alice', nameField, 'create');   // 'Alice'
 * applyDefaultValue(undefined, nameField, 'update'); // undefined
 *
 * // Field with dynamic default
 * const createdField = { type: 'date', defaultValue: () => new Date() };
 * applyDefaultValue(undefined, createdField, 'create'); // Current date
 * ```
 */
export function applyDefaultValue(
	inputValue: Primitive,
	field: Field,
	operation: 'create' | 'update'
): Primitive {
	if (operation === 'update') {
		return inputValue;
	}
	if ((inputValue === undefined || inputValue === null) && field.defaultValue) {
		if (typeof field.defaultValue === 'function') {
			return field.defaultValue();
		}
		return field.defaultValue;
	}
	return inputValue;
}
