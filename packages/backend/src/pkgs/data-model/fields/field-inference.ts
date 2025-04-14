import type {
  InferValueType as BaseInferValueType,
  Field,
  FieldType,
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
