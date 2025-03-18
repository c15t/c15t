/**
 * Basic field creation utilities for entity schema definitions
 */
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { SchemaField } from '../schema.types';

/**
 * Helper to create a standard schema compatible field with a validator
 *
 * @param type The field type
 * @param options Field options including a validator
 * @returns A schema field definition with a validator
 */
export function field<
	TFieldType extends string,
	TValidator extends StandardSchemaV1<unknown, TValueType>,
	TValueType = TFieldType extends 'string'
		? string
		: TFieldType extends 'number'
			? number
			: TFieldType extends 'boolean'
				? boolean
				: TFieldType extends 'date' | 'timestamp' | 'createdAt' | 'updatedAt'
					? Date
					: TFieldType extends 'array'
						? unknown[]
						: TFieldType extends 'object' | 'json'
							? Record<string, unknown>
							: TFieldType extends
										| 'uuid'
										| 'id'
										| 'email'
										| 'url'
										| 'slug'
										| 'phone'
								? string
								: TFieldType extends `${string}_id`
									? string
									: TFieldType extends 'incremental_id'
										? number
										: unknown,
>(
	type: TFieldType,
	options: Partial<Omit<SchemaField<TFieldType, TValueType>, 'type'>> & {
		validator: TValidator;
	}
): SchemaField<TFieldType, TValueType> & { validator: TValidator } {
	return {
		type,
		...options,
		validator: options.validator,
	};
}

/**
 * Helper to create a standard field without a validator
 *
 * @param type The field type
 * @param options Field options
 * @returns A schema field definition
 */
export function createField<
	TFieldType extends string,
	TValueType = TFieldType extends 'string'
		? string
		: TFieldType extends 'number'
			? number
			: TFieldType extends 'boolean'
				? boolean
				: TFieldType extends 'date' | 'timestamp' | 'createdAt' | 'updatedAt'
					? Date
					: TFieldType extends 'array'
						? unknown[]
						: TFieldType extends 'object' | 'json'
							? Record<string, unknown>
							: TFieldType extends
										| 'uuid'
										| 'id'
										| 'email'
										| 'url'
										| 'slug'
										| 'phone'
								? string
								: TFieldType extends `${string}_id`
									? string
									: TFieldType extends 'incremental_id'
										? number
										: unknown,
>(
	type: TFieldType,
	options?: Partial<Omit<SchemaField<TFieldType, TValueType>, 'type'>>
): SchemaField<TFieldType, TValueType> {
	return {
		type,
		...options,
	} as SchemaField<TFieldType, TValueType>;
}

/**
 * Creates a basic number field
 *
 * @param options Field options
 * @returns A schema field definition of type 'number'
 */
export function numberField(
	options?: Partial<Omit<SchemaField, 'type'>>
): SchemaField {
	return createField('number', options);
}

/**
 * Creates a basic boolean field
 *
 * @param options Field options
 * @returns A schema field definition of type 'boolean'
 */
export function booleanField(
	options?: Partial<Omit<SchemaField, 'type'>>
): SchemaField {
	return createField('boolean', options);
}

/**
 * Creates a basic date field
 *
 * @param options Field options
 * @returns A schema field definition of type 'date'
 */
export function dateField(
	options?: Partial<Omit<SchemaField, 'type'>>
): SchemaField {
	return createField('date', options);
}
