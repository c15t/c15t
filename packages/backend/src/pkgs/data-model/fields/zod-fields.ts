import { z } from 'zod';
import type { Field, FieldType } from './field-types';

/**
 * Base Zod schema for field configuration options
 */
const fieldConfigSchema = z.object({
	required: z.boolean().prefault(true),
	returned: z.boolean().prefault(true),
	input: z.boolean().prefault(true),
	defaultValue: z.any().optional(),
	transform: z
		.object({
			input: z.any().optional(),
			output: z.any().optional(),
		})
		.optional(),
	validator: z.any().optional(),
	unique: z.boolean().optional(),
	indexed: z.boolean().optional(),
	sortable: z.boolean().prefault(true),
	fieldName: z.string().optional(),
	bigint: z.boolean().prefault(false),
});

/**
 * Zod schema for string field configuration
 */
export const stringFieldSchema = fieldConfigSchema.extend({
	type: z.literal('string'),
	minLength: z.number().optional(),
	maxLength: z.number().optional(),
	pattern: z.string().optional(),
});

/**
 * Zod schema for number field configuration
 */
export const numberFieldSchema = fieldConfigSchema.extend({
	type: z.literal('number'),
	min: z.number().optional(),
	max: z.number().optional(),
});

/**
 * Zod schema for boolean field configuration
 */
export const booleanFieldSchema = fieldConfigSchema.extend({
	type: z.literal('boolean'),
});

/**
 * Zod schema for date field configuration
 */
export const dateFieldSchema = fieldConfigSchema.extend({
	type: z.literal('date'),
	minDate: z.date().optional(),
	maxDate: z.date().optional(),
	dateOnly: z.boolean().prefault(false),
	format: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Zod schema for timezone field configuration
 */
export const timezoneFieldSchema = fieldConfigSchema.extend({
	type: z.literal('timezone'),
	validateTimezone: z.boolean().prefault(true),
	suggestedValues: z.array(z.string()).optional(),
	restrictToSuggestedValues: z.boolean().prefault(false),
});

/**
 * Zod schema for JSON field configuration
 */
export const jsonFieldSchema = fieldConfigSchema.extend({
	type: z.literal('json'),
	validateJson: z.boolean().prefault(true),
});

/**
 * Zod schema for string array field configuration
 */
export const stringArrayFieldSchema = fieldConfigSchema.extend({
	type: z.literal('string[]'),
});

/**
 * Zod schema for number array field configuration
 */
export const numberArrayFieldSchema = fieldConfigSchema.extend({
	type: z.literal('number[]'),
});

/**
 * Union type of all field schemas
 */
export const fieldSchema = z.discriminatedUnion('type', [
	stringFieldSchema,
	numberFieldSchema,
	booleanFieldSchema,
	dateFieldSchema,
	timezoneFieldSchema,
	jsonFieldSchema,
	stringArrayFieldSchema,
	numberArrayFieldSchema,
]);

/**
 * Type for a validated field configuration
 */
export type ValidatedField<TFieldType extends FieldType> = z.infer<
	typeof fieldSchema
> & {
	type: TFieldType;
};

/**
 * Validates a field configuration against its schema
 */
export function validateField<TFieldType extends FieldType>(
	field: Field<TFieldType>
): ValidatedField<TFieldType> {
	return fieldSchema.parse(field) as ValidatedField<TFieldType>;
}
