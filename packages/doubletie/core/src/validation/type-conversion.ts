import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { SchemaField } from '../schema/schema.types';

/**
 * Common field types used in the schema system
 */
export type FieldType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'date'
	| 'timestamp'
	| 'uuid'
	| 'id'
	| 'incremental_id'
	| 'json'
	| 'array'
	| string;

/**
 * Map field types to their JavaScript type
 */
export type FieldTypeToValueType<T extends FieldType> = T extends
	| 'string'
	| 'uuid'
	| 'id'
	? string
	: T extends 'number' | 'incremental_id'
		? number
		: T extends 'boolean'
			? boolean
			: T extends 'date' | 'timestamp'
				? Date
				: T extends 'json'
					? Record<string, unknown>
					: T extends 'array'
						? Array<unknown>
						: unknown;

/**
 * Helper function to convert values to appropriate types based on field definition
 * @param value The value to convert
 * @param fieldDef The field definition
 * @param fieldName The name of the field
 * @returns The converted value with the appropriate type
 */
export function convertValueToFieldType<
	TFieldType extends FieldType = FieldType,
	TValue = FieldTypeToValueType<TFieldType>,
	TValidator extends StandardSchemaV1<unknown, TValue> = StandardSchemaV1<
		unknown,
		TValue
	>,
>(
	value: unknown,
	fieldDef: SchemaField<TFieldType, TValue, TValidator>,
	fieldName: string
): TValue {
	// Handle null explicitly
	if (value === null) {
		return null as TValue;
	}

	// If the field has a custom input transform, use it
	if (fieldDef.transform?.input) {
		try {
			return fieldDef.transform.input(value);
		} catch (error) {
			console.warn(`Transform error for field ${fieldName}:`, error);
			// Fall through to standard conversions if transform fails
		}
	}

	// Handle conversion based on field type
	const fieldType = fieldDef.type;

	// Timestamp/Date fields
	const timestampPatterns = ['createdAt', 'updatedAt', 'deletedAt'];
	const timestampSuffixes = ['At', '_at'];

	if (
		fieldType === 'date' ||
		fieldType === 'timestamp' ||
		timestampPatterns.includes(fieldName) ||
		timestampSuffixes.some((suffix) => fieldName.endsWith(suffix))
	) {
		// Convert to Date if not already
		return (value instanceof Date ? value : new Date(String(value))) as TValue;
	}

	// ID fields - ensure they're strings (except incremental IDs)
	const idPatterns = ['id'];
	const idSuffixes = ['Id', '_id'];

	if (
		idPatterns.includes(fieldName) ||
		fieldDef.primaryKey === true ||
		idSuffixes.some((suffix) => fieldName.endsWith(suffix)) ||
		fieldType === 'uuid' ||
		fieldType === 'id'
	) {
		// Only convert to string if it's not an incremental ID
		if (fieldType !== 'incremental_id' && fieldType !== 'number') {
			return String(value) as TValue;
		}
	}

	// Number fields
	if (fieldType === 'number' || fieldType === 'incremental_id') {
		// Convert to number if not already
		return (typeof value === 'number' ? value : Number(value)) as TValue;
	}

	const isTrueString = (str: string) =>
		['true', 'yes', 'y', '1'].includes(str.toLowerCase());

	const isFalseString = (str: string) =>
		['false', 'no', 'n', '0'].includes(str.toLowerCase());

	// Boolean fields
	if (
		fieldType === 'boolean' ||
		fieldName.startsWith('is') ||
		fieldName.startsWith('has')
	) {
		// Convert to boolean if not already
		if (typeof value === 'boolean') {
			return value as TValue;
		}
		if (typeof value === 'string') {
			if (isTrueString(value)) return true as TValue;
			if (isFalseString(value)) return false as TValue;
		}
		return Boolean(value) as TValue;
	}

	// For all other cases, return as is
	return value as TValue;
}
