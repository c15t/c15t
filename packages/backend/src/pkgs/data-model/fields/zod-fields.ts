import { z } from 'zod';
import type {
	Field,
	FieldType,
	InferValueType,
	JsonValue,
} from './field-types';

/**
 * Base Zod schema for field configuration options
 */
const fieldConfigSchema = z.object({
	required: z.boolean().default(true),
	returned: z.boolean().default(true),
	input: z.boolean().default(true),
	defaultValue: z.union([z.any(), z.function().returns(z.any())]).optional(),
	transform: z
		.object({
			input: z
				.function()
				.args(z.any())
				.returns(z.union([z.any(), z.promise(z.any())]))
				.optional(),
			output: z
				.function()
				.args(z.any())
				.returns(z.union([z.any(), z.promise(z.any())]))
				.optional(),
		})
		.optional(),
	validator: z
		.function()
		.args(z.any())
		.returns(z.union([z.string(), z.null()]))
		.optional(),
	unique: z.boolean().optional(),
	indexed: z.boolean().optional(),
	sortable: z.boolean().default(true),
	fieldName: z.string().optional(),
	bigint: z.boolean().default(false),
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
	dateOnly: z.boolean().default(false),
	format: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for timezone field configuration
 */
export const timezoneFieldSchema = fieldConfigSchema.extend({
	type: z.literal('timezone'),
	validateTimezone: z.boolean().default(true),
	suggestedValues: z.array(z.string()).optional(),
	restrictToSuggestedValues: z.boolean().default(false),
});

/**
 * Zod schema for JSON field configuration
 */
export const jsonFieldSchema = fieldConfigSchema.extend({
	type: z.literal('json'),
	validateJson: z.boolean().default(true),
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
 * Creates a Zod schema for a field's value based on its type
 */
export function createFieldValueSchema<TFieldType extends FieldType>(
	field: ValidatedField<TFieldType>
): z.ZodType<InferValueType<TFieldType>> {
	type ValueType = InferValueType<TFieldType>;

	const baseSchema = (() => {
		switch (field.type) {
			case 'string': {
				let schema = z.string();
				if ('minLength' in field && field.minLength !== undefined) {
					schema = schema.min(field.minLength);
				}
				if ('maxLength' in field && field.maxLength !== undefined) {
					schema = schema.max(field.maxLength);
				}
				if ('pattern' in field && field.pattern) {
					schema = schema.regex(new RegExp(field.pattern));
				}
				return schema;
			}

			case 'number': {
				let schema = z.number();
				if ('min' in field && field.min !== undefined) {
					schema = schema.min(field.min);
				}
				if ('max' in field && field.max !== undefined) {
					schema = schema.max(field.max);
				}
				return schema;
			}

			case 'boolean':
				return z.boolean();

			case 'date': {
				let schema = z.date();
				if ('minDate' in field && field.minDate) {
					schema = schema.min(field.minDate);
				}
				if ('maxDate' in field && field.maxDate) {
					schema = schema.max(field.maxDate);
				}
				return schema;
			}

			case 'timezone': {
				let schema: z.ZodType<string> = z.string();
				if ('validateTimezone' in field && field.validateTimezone) {
					schema = schema.superRefine((val, ctx) => {
						try {
							Intl.DateTimeFormat(undefined, { timeZone: val });
						} catch {
							ctx.addIssue({
								code: z.ZodIssueCode.custom,
								message: 'Invalid timezone',
							});
						}
					});
				}
				if (
					'restrictToSuggestedValues' in field &&
					field.restrictToSuggestedValues &&
					'suggestedValues' in field &&
					field.suggestedValues
				) {
					const suggestedValues = field.suggestedValues;
					schema = schema.superRefine((val, ctx) => {
						if (!suggestedValues.includes(val)) {
							ctx.addIssue({
								code: z.ZodIssueCode.custom,
								message: 'Timezone not in allowed values',
							});
						}
					});
				}
				return schema;
			}

			case 'json': {
				let schema: z.ZodType<JsonValue> = z.any();
				if ('validateJson' in field && field.validateJson) {
					schema = schema.superRefine((val, ctx) => {
						try {
							JSON.stringify(val);
						} catch {
							ctx.addIssue({
								code: z.ZodIssueCode.custom,
								message: 'Invalid JSON',
							});
						}
					});
				}
				return schema;
			}

			case 'string[]':
				return z.array(z.string());

			case 'number[]':
				return z.array(z.number());

			default:
				throw new Error(`Unsupported field type: ${field.type}`);
		}
	})() as z.ZodType<ValueType>;

	// Apply custom validation if provided
	if (field.validator) {
		const validator = field.validator;
		return baseSchema.superRefine((val, ctx) => {
			const result = validator(val);
			if (result !== null) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: result,
				});
			}
		}) as z.ZodType<ValueType>;
	}

	return baseSchema;
}

/**
 * Validates a field configuration against its schema
 */
export function validateField<TFieldType extends FieldType>(
	field: Field<TFieldType>
): ValidatedField<TFieldType> {
	return fieldSchema.parse(field) as ValidatedField<TFieldType>;
}
