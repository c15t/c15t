import type {
	InferValueType as BaseInferValueType,
	Field,
	FieldType,
	Primitive,
} from './field-types';

/**
 * Infers the JavaScript type from a field type.
 * Maps database field types to their corresponding TypeScript types.
 *
 * @template TFieldType - The field type to infer from
 *
 * @example
 * ```typescript
 * // Infer string type
 * type NameType = InferValueType<'string'>;  // string
 *
 * // Infer array types
 * type TagsType = InferValueType<'string[]'>;  // string[]
 * type FlagsType = InferValueType<'boolean[]'>;  // boolean[]
 * type DatesType = InferValueType<'date[]'>;  // Date[]
 * ```
 *
 * @remarks
 * This type handles both scalar types and array types.
 * For arrays, it maps the base type to an array of that type.
 * This approach is more maintainable and future-proof than
 * explicitly handling each array type.
 */
export type InferValueType<TFieldType extends FieldType> =
	BaseInferValueType<TFieldType>;

/**
 * Infers the output type for a single field.
 * Takes into account whether the field is required and returned in API responses.
 *
 * @template TField - The field definition
 *
 * @example
 * ```typescript
 * // A required string field
 * const nameField: Field<'string'> = {
 *   type: 'string',
 *   required: true
 * };
 * type NameOutput = InferFieldOutput<typeof nameField>;  // string
 *
 * // An optional number field
 * const ageField: Field<'number'> = {
 *   type: 'number',
 *   required: false
 * };
 * type AgeOutput = InferFieldOutput<typeof ageField>;  // number | null | undefined
 * ```
 *
 * @remarks
 * If a field has `returned: false`, this will be `never` indicating
 * the field should not appear in API responses.
 */
export type InferFieldOutput<TField extends Field> =
	TField['returned'] extends false
		? never
		: TField['required'] extends false
			? InferValueType<TField['type']> | null | undefined
			: InferValueType<TField['type']>;

/**
 * Infers the input type for a single field.
 * Determines the expected type when creating or updating records.
 *
 * @template TField - The field definition
 *
 * @example
 * ```typescript
 * // A non-input field (system-generated)
 * const createdAtField: Field<'date'> = {
 *   type: 'date',
 *   required: true,
 *   input: false
 * };
 * type CreatedAtInput = InferFieldInput<typeof createdAtField>;  // never
 * ```
 *
 * @remarks
 * If a field has `input: false`, this will be `never` indicating
 * the field should not be provided in API requests.
 */
export type InferFieldInput<TField extends Field> =
	TField['input'] extends false
		? never
		: TField['required'] extends true
			? InferValueType<TField['type']>
			: InferValueType<TField['type']> | null | undefined;

/**
 * Type-safe property mapping helper for field outputs.
 * Maps properties of a record type to their corresponding output types.
 *
 * @template TSchema - The record type containing field definitions
 * @template TKey - The keys of TSchema to map
 *
 * @internal
 * This is an internal helper type used by InferFieldsOutput
 */
// type MapToFieldOutputType<TSchema, TKey extends keyof TSchema & string> = {
// 	[Property in TKey]: TSchema[Property] extends Field
// 		? InferFieldOutput<TSchema[Property]>
// 		: never;
// };

// /**
//  * Type-safe property mapping helper for field inputs.
//  * Maps properties of a record type to their corresponding input types.
//  *
//  * @template TSchema - The record type containing field definitions
//  * @template TKey - The keys of TSchema to map
//  *
//  * @internal
//  * This is an internal helper type used by InferFieldsInput
//  */
// type MapToFieldInputType<TSchema, TKey extends keyof TSchema & string> = {
// 	[Property in TKey]: TSchema[Property] extends Field
// 		? InferFieldInput<TSchema[Property]>
// 		: never;
// };

/**
 * Type helper to extract required keys from fields that should be returned.
 * Identifies fields that are both required and returned in API responses.
 *
 * @template TSchema - The record type containing field definitions
 *
 * @internal
 * Used to determine which fields must be present in output types
 */
type RequiredKeys<TSchema> = {
	[Key in keyof TSchema]: TSchema[Key] extends Field
		? TSchema[Key]['required'] extends true
			? TSchema[Key]['returned'] extends false
				? never
				: Key
			: never
		: never;
}[keyof TSchema];

/**
 * Type helper to extract optional keys from fields that should be returned.
 * Identifies fields that are optional but should be returned in API responses.
 *
 * @template TSchema - The record type containing field definitions
 *
 * @internal
 * Used to determine which fields may be present in output types
 */
type OptionalKeys<TSchema> = {
	[Key in keyof TSchema]: TSchema[Key] extends Field
		? TSchema[Key]['required'] extends true
			? never
			: TSchema[Key]['returned'] extends false
				? never
				: Key
		: never;
}[keyof TSchema];

/**
 * Type helper to extract required keys from fields that accept input.
 * Identifies fields that are both required and accept subject input.
 *
 * @template TSchema - The record type containing field definitions
 *
 * @internal
 * Used to determine which fields must be provided in create operations
 */
type RequiredInputKeys<TSchema> = {
	[Key in keyof TSchema]: TSchema[Key] extends Field
		? TSchema[Key]['required'] extends true
			? TSchema[Key]['input'] extends false
				? never
				: Key
			: never
		: never;
}[keyof TSchema];

/**
 * Type helper to extract optional keys from fields that accept input.
 * Identifies fields that are optional and accept subject input.
 *
 * @template TSchema - The record type containing field definitions
 *
 * @internal
 * Used to determine which fields may be provided in create operations
 */
type OptionalInputKeys<TSchema> = {
	[Key in keyof TSchema]: TSchema[Key] extends Field
		? TSchema[Key]['required'] extends true
			? never
			: TSchema[Key]['input'] extends false
				? never
				: Key
		: never;
}[keyof TSchema];

/**
 * Infers the output type shape for a set of fields.
 * Handles required/optional status and returned fields.
 * Used to determine the shape of data when retrieving records.
 *
 * @template TSchema - The field definitions to infer from
 *
 * @example
 * ```typescript
 * // Define a schema
 * const subjectSchema = {
 *   id: stringField({ required: true }),
 *   name: stringField({ required: true }),
 *   email: stringField({ required: true }),
 *   age: numberField({ required: false }),
 *   password: stringField({ required: true, returned: false })
 * };
 *
 * // Infer the output type (for API responses)
 * type SubjectOutput = InferFieldsOutput<typeof subjectSchema>;
 * // Result: { id: string; name: string; email: string; age?: number | null | undefined }
 * // Note: 'password' is excluded because returned: false
 * ```
 *
 * @remarks
 * This creates a type with:
 * - Required properties for fields marked required and returned
 * - Optional properties for fields marked optional and returned
 * - Excludes fields marked with returned: false
 */
export type InferFieldsOutput<TSchema> = TSchema extends Record<string, Field>
	? {
			[Key in RequiredKeys<TSchema> & string]: InferFieldOutput<TSchema[Key]>;
		} & {
			[Key in OptionalKeys<TSchema> & string]?: InferFieldOutput<TSchema[Key]>;
		}
	: Record<string, never>;

/**
 * Infers the input type shape for a set of fields.
 * Handles required/optional status and input fields.
 * Used to determine the shape of data expected when creating records.
 *
 * @template TSchema - The field definitions to infer from
 *
 * @example
 * ```typescript
 * // Define a schema
 * const subjectSchema = {
 *   id: stringField({ required: true, input: false }), // Auto-generated
 *   name: stringField({ required: true }),
 *   email: stringField({ required: true }),
 *   age: numberField({ required: false }),
 *   createdAt: dateField({ required: true, input: false })
 * };
 *
 * // Infer the input type (for create operations)
 * type SubjectInput = InferFieldsInput<typeof subjectSchema>;
 * // Result: { name: string; email: string; age?: number | null | undefined }
 * // Note: 'id' and 'createdAt' are excluded because input: false
 * ```
 *
 * @remarks
 * This creates a type with:
 * - Required properties for fields marked required and input
 * - Optional properties for fields marked optional and input
 * - Excludes fields marked with input: false
 */
export type InferFieldsInput<TSchema> = TSchema extends Record<string, Field>
	? {
			[Key in RequiredInputKeys<TSchema> & string]: InferFieldInput<
				TSchema[Key]
			>;
		} & {
			[Key in OptionalInputKeys<TSchema> & string]?: InferFieldInput<
				TSchema[Key]
			>;
		}
	: Record<string, never>;

/**
 * Type helper for transform function output based on field type.
 * Ensures transform functions return the correct output type.
 *
 * @template TFieldType - The field type that determines the input parameter type
 *
 * @example
 * ```typescript
 * const dateTransform: TransformOutputFn<'date'> = (value) => value.toISOString();
 * // value is typed as Date
 * ```
 */
export type TransformOutputFn<TFieldType extends FieldType> = (
	value: InferValueType<TFieldType>
) => Primitive | Promise<Primitive>;
