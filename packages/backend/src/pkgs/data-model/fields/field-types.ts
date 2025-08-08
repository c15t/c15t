/**
 * The set of field types supported by c15t.
 * Specifies the data types that can be used for database fields.
 *
 * @remarks
 * These types determine how data is stored, validated, and transformed.
 * The system supports both scalar types and array types.
 */
export type FieldType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'date'
	| 'timezone'
	| 'json'
	| 'string[]'
	| 'number[]';

/**
 * Primitive types that can be stored in the database.
 */
export type Primitive = string | number | boolean | Date | null | undefined;

/**
 * JSON value types that can be stored in JSON fields.
 */
export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

/**
 * Configuration options for a database field.
 * Defines the behavior, validation, and transformations for a field.
 *
 * @template TFieldType - The data type of the field
 *
 * @example
 * ```typescript
 * // Basic required string field
 * const basicConfig: FieldConfig<'string'> = {
 *   type: 'string',
 *   required: true
 * };
 *
 * // Optional number field with validation
 * const numberConfig: FieldConfig<'number'> = {
 *   type: 'number',
 *   required: false,
 *   validator: (value) => value >= 0 ? null : 'Must be non-negative'
 * };
 *
 * // Date field with transform and default
 * const dateConfig: FieldConfig<'date'> = {
 *   type: 'date',
 *   defaultValue: () => new Date(),
 *   transform: {
 *     output: (date) => date.toISOString()
 *   }
 * };
 * ```
 *
 * @remarks
 * This is the core configuration object that defines how a field behaves
 * in the database schema. It controls whether the field is required, how
 * it's transformed, validated, and more.
 */
export type FieldConfig<TFieldType extends FieldType> = {
	/**
	 * The data type of the field.
	 * Determines how the field is stored and validated.
	 */
	type: TFieldType;

	/**
	 * Whether the field is required for record creation.
	 * If true, the field must be provided when creating a record.
	 * @default true
	 */
	required?: boolean;

	/**
	 * Whether the field should be returned in API responses.
	 * If false, the field will be excluded from query results.
	 * @default true
	 */
	returned?: boolean;

	/**
	 * Whether the field accepts input from API requests.
	 * If false, the field cannot be set directly by clients.
	 * @default true
	 */
	input?: boolean;

	/**
	 * Default value for the field when not provided in create operations.
	 * Can be a static value or a function that returns a value.
	 */
	defaultValue?: Primitive | (() => Primitive);

	/**
	 * Functions to transform the field value during input/output operations.
	 * Can modify values before storage or after retrieval.
	 */
	transform?: {
		/**
		 * Transform function for field input.
		 * Applied when data is being saved to the database.
		 */
		input?: (
			value: InferValueType<TFieldType>
		) => Primitive | Promise<Primitive>;

		/**
		 * Transform function for field output.
		 * Applied when data is being retrieved from the database.
		 */
		output?: (
			value: unknown
		) => InferValueType<TFieldType> | Promise<InferValueType<TFieldType>>;
	};

	/**
	 * Custom validation function for the field.
	 * Returns null if valid, or an error message if invalid.
	 */
	validator?: (value: InferValueType<TFieldType>) => string | null;

	/**
	 * Whether the field should be unique across all records.
	 * If true, no two records can have the same value for this field.
	 */
	unique?: boolean;

	/**
	 * Whether the field should be indexed for faster lookups.
	 * If true, an index will be created for this field.
	 */
	indexed?: boolean;

	/**
	 * Whether the field should be sortable in queries.
	 * If false, the field cannot be used in ORDER BY clauses.
	 * @default true
	 */
	sortable?: boolean;

	/**
	 * Custom database field name.
	 * If not provided, the field name will be used as-is.
	 */
	fieldName?: string;

	/**
	 * Whether the field should be stored as a bigint.
	 * Only applicable to number fields.
	 * @default false
	 */
	bigint?: boolean;

	/**
	 * References to other models.
	 */
	references?: {
		model: string;
		entity: string;
		field: string;
		onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
	};
};

/**
 * Helper type to infer the base JavaScript type from a field type.
 */
export type InferValueType<TFieldType extends FieldType> =
	TFieldType extends 'string'
		? string
		: TFieldType extends 'number'
			? number
			: TFieldType extends 'boolean'
				? boolean
				: TFieldType extends 'date'
					? Date
					: TFieldType extends 'timezone'
						? string
						: TFieldType extends 'json'
							? JsonValue
							: TFieldType extends 'string[]'
								? string[]
								: TFieldType extends 'number[]'
									? number[]
									: never;

/**
 * The complete definition of a database field.
 * Combines the field type with its configuration options.
 *
 * @template TFieldType - The data type of the field
 *
 * @example
 * ```typescript
 * // A simple string field
 * const nameField: Field<'string'> = {
 *   type: 'string',
 *   required: true,
 *   unique: true
 * };
 *
 * // A number field with validation
 * const ageField: Field<'number'> = {
 *   type: 'number',
 *   required: true,
 *   validator: (value) => value >= 0 ? null : 'Age must be non-negative'
 * };
 *
 * // A date field with transforms
 * const createdAtField: Field<'date'> = {
 *   type: 'date',
 *   required: true,
 *   input: false,
 *   defaultValue: () => new Date(),
 *   transform: {
 *     output: (date) => date.toISOString()
 *   }
 * };
 * ```
 */
export type Field<TFieldType extends FieldType = FieldType> =
	FieldConfig<TFieldType>;
