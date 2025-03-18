/**
 * Array field utilities for entity schema definitions
 */
import { z } from 'zod';
import type { ZodArray, ZodTypeAny } from 'zod';
import type { SchemaField } from '../schema.types';
import { createField } from './basic-fields';

export interface ArrayFieldOptions extends Partial<Omit<SchemaField, 'type'>> {
	/**
	 * Zod schema for validating array items
	 */
	itemSchema?: z.ZodType<any>;

	/**
	 * Minimum number of items required
	 */
	minItems?: number;

	/**
	 * Maximum number of items allowed
	 */
	maxItems?: number;

	/**
	 * Whether to disallow duplicate items
	 */
	uniqueItems?: boolean;
}

/**
 * Creates an array field with optional item validation
 *
 * @param options Configuration options for the array field
 * @returns A schema field configured for array data
 *
 * @example
 * // Basic array field
 * arrayField()
 *
 * @example
 * // Array of strings with validation
 * arrayField({
 *   itemSchema: z.string(),
 *   minItems: 1,
 *   maxItems: 10
 * })
 */
export function arrayField(options?: ArrayFieldOptions): SchemaField {
	const {
		itemSchema = z.any(),
		minItems,
		maxItems,
		uniqueItems,
		...rest
	} = options || {};

	// First we'll create our validator steps individually
	const baseValidator = z.array(itemSchema);

	// Create a validation chain
	let sizeConstrainedValidator = baseValidator;
	if (minItems !== undefined) {
		sizeConstrainedValidator = sizeConstrainedValidator.min(minItems);
	}
	if (maxItems !== undefined) {
		sizeConstrainedValidator = sizeConstrainedValidator.max(maxItems);
	}

	// For the uniqueness check, we'll use a separate validation step
	// This approach avoids the ZodEffects type issue
	const checkUniqueness = (items: any[]): boolean => {
		if (!uniqueItems) return true;
		const set = new Set(items.map((item) => JSON.stringify(item)));
		return set.size === items.length;
	};

	// The final validator with safeParse and custom validation
	// This uses type casting to ensure TypeScript treats our output as a ZodArray
	const validator = z.preprocess(
		(val) => val, // identity preprocessor
		z.custom<any[]>(
			(val) => {
				// First validate with the size-constrained validator
				const result = sizeConstrainedValidator.safeParse(val);
				if (!result.success) {
					return false;
				}

				// Then check uniqueness
				return checkUniqueness(result.data);
			},
			{
				message: uniqueItems
					? 'Array must be valid and contain unique items'
					: 'Array must be valid',
			}
		)
	) as unknown as ZodArray<ZodTypeAny>;

	// Transform functions for handling array-like inputs
	const inputTransform = (value: unknown) => {
		// Handle JSON strings
		if (typeof value === 'string') {
			try {
				const parsed = JSON.parse(value);
				if (Array.isArray(parsed)) {
					return parsed;
				}
			} catch (e) {
				// Let validation handle the error
			}
		}

		// Handle comma-separated strings
		if (typeof value === 'string' && value.includes(',')) {
			return value.split(',').map((item) => item.trim());
		}

		// Ensure value is always an array
		if (value === undefined || value === null) {
			return [];
		}

		if (!Array.isArray(value)) {
			return [value];
		}

		return value;
	};

	return createField('array', {
		validator,
		defaultValue: [],
		transform: {
			input: inputTransform,
		},
		...rest,
	});
}

/**
 * Creates a string array field
 *
 * @param options Additional options for the string array field
 * @returns A schema field configured for arrays of strings
 *
 * @example
 * // Basic string array field
 * stringArrayField()
 */
export function stringArrayField(
	options?: Omit<ArrayFieldOptions, 'itemSchema'>
): SchemaField {
	return arrayField({
		itemSchema: z.string(),
		...options,
	});
}

/**
 * Creates a number array field
 *
 * @param options Additional options for the number array field
 * @returns A schema field configured for arrays of numbers
 *
 * @example
 * // Basic number array field
 * numberArrayField()
 */
export function numberArrayField(
	options?: Omit<ArrayFieldOptions, 'itemSchema'>
): SchemaField {
	return arrayField({
		itemSchema: z.number(),
		...options,
	});
}

/**
 * Creates a reference array field for storing IDs that reference another entity
 *
 * @param options Additional options for the reference array field
 * @returns A schema field configured for arrays of reference IDs
 *
 * @example
 * // Reference array field for tags
 * refArrayField({ uniqueItems: true })
 */
export function refArrayField(
	options?: Omit<ArrayFieldOptions, 'itemSchema'>
): SchemaField {
	return arrayField({
		itemSchema: z.string(),
		uniqueItems: true,
		...options,
	});
}
