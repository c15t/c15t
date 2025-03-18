import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { EntityStructure } from '../entity/entity.types';
import type {
	EntitySchemaDefinition,
	FieldValueType,
} from '../schema/schema.types';
import {
	assertCondition,
	isEntitySchemaDefinition,
	isSchemaField,
	isStandardSchema,
	isValidationError,
} from '../utils/type-guards';
import type { DeepPartial, EntityRecord } from '../utils/type-infer';
import { convertValueToFieldType } from './type-conversion';

/**
 * Validation error interface for type-safe error handling
 */
export interface ValidationError extends Error {
	issues: Array<{ field: string; issues: string }>;
}

/**
 * Create a type-safe validation error
 */
export function createValidationError(
	issues: Array<{ field: string; issues: string }>
): ValidationError {
	const error = new Error(
		`Validation failed: ${JSON.stringify(issues, null, 2)}`
	) as ValidationError;
	error.issues = issues;
	return error;
}

/**
 * Validation result type for standardizing return values
 */
export interface ValidationResult<T> {
	value: T;
	issues?: Array<{ path: string; message: string }>;
}

/**
 * Validate entity data using a Standard Schema validator
 * @param schema Standard Schema validator
 * @param data Input data to validate
 * @returns Validated data
 */
export async function validateEntity<
	T extends StandardSchemaV1<TInput, TOutput>,
	TInput = unknown,
	TOutput = TInput,
>(
	schema: T,
	data: StandardSchemaV1.InferInput<T>
): Promise<StandardSchemaV1.InferOutput<T>> {
	// Validate schema is a Standard Schema
	assertCondition(
		isStandardSchema(schema),
		'Invalid schema: must be a StandardSchema with ~standard.validate method'
	);

	// Skip validation check on data since entity.ts now pre-processes this
	// No need for assertCondition on data
	const result = await schema['~standard'].validate(data);

	// Check if result has issues property
	if ('issues' in result && result.issues) {
		throw createValidationError([
			{ field: 'schema', issues: JSON.stringify(result.issues) },
		]);
	}

	// Handle result with value property
	if ('value' in result) {
		return result.value as StandardSchemaV1.InferOutput<T>;
	}

	// Fallback - ensure safe type conversion
	return data as unknown as StandardSchemaV1.InferOutput<T>;
}

/**
 * Type-safe entity validator for field-by-field validation
 * @template TEntity Entity type with schema fields
 * @template TInput Input data type (partial or complete)
 * @template TOutput Output data type (fully validated)
 */
export function createTypedValidator<
	TEntity extends EntityStructure,
	TInput extends DeepPartial<EntityRecord<TEntity>> = DeepPartial<
		EntityRecord<TEntity>
	>,
	TOutput = EntityRecord<TEntity>,
>() {
	return async (
		data: TInput,
		entityDef: TEntity & EntitySchemaDefinition
	): Promise<TOutput> => {
		// Use the existing validateEntityWithFieldValidators with proper type assertions
		const result = await validateEntityWithFieldValidators(
			data as Record<string, FieldValueType>,
			entityDef
		);

		// Return the validated data with proper type
		return result as TOutput;
	};
}

/**
 * Validate entity data using field-by-field validation
 * @param data Input data to validate
 * @param entityDef Entity definition with field validators
 * @returns Validated data with proper typing
 */
export async function validateEntityWithFieldValidators<
	TInput = unknown,
	TOutput = Record<string, FieldValueType>,
>(data: TInput, entityDef: EntitySchemaDefinition): Promise<TOutput> {
	// Validate entity definition
	assertCondition(
		isEntitySchemaDefinition(entityDef),
		'Invalid entity definition: must have name and fields properties'
	);

	// Skip validation on data type since entity.ts now pre-processes this
	// and ensures dataToValidate is always a valid object

	// Remove the assertCondition check on data

	const errors: Array<{ field: string; issues: string }> = [];
	// First create a deep copy of the input data to avoid mutations
	const initialData =
		typeof data === 'object' && data !== null
			? { ...(data as Record<string, any>) }
			: {};
	// Then create our output object
	const validatedData: Record<string, FieldValueType> = {};

	// Process and validate all fields defined in the entity schema
	for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
		// Ensure field definition is valid
		assertCondition(
			isSchemaField(fieldDef),
			`Invalid field definition for '${fieldName}': missing required properties`
		);

		// Get data safely with proper typing
		const dataObj =
			typeof data === 'object' && data !== null
				? (data as Record<string, any>)
				: {};

		// Check required fields
		if (
			fieldDef.required &&
			(dataObj[fieldName] === undefined || dataObj[fieldName] === null)
		) {
			errors.push({ field: fieldName, issues: 'Field is required' });
			continue;
		}

		// Handle default values for undefined fields
		if (
			dataObj[fieldName] === undefined &&
			fieldDef.defaultValue !== undefined
		) {
			// Generate the default value (handle function or direct value)
			const defaultValue =
				typeof fieldDef.defaultValue === 'function'
					? fieldDef.defaultValue()
					: fieldDef.defaultValue;

			// Apply the value with automatic type conversion based on field definition
			validatedData[fieldName] = convertValueToFieldType(
				defaultValue,
				fieldDef,
				fieldName
			);

			continue;
		}

		// Validate fields with schema if the field has a value
		if (fieldDef.validator && dataObj[fieldName] !== undefined) {
			try {
				// Check if validator is valid
				assertCondition(
					isStandardSchema(fieldDef.validator),
					`Invalid validator for field '${fieldName}': not a Standard Schema`
				);

				// Run validation using the field's validator
				const validatedValue = await validateEntity(
					fieldDef.validator,
					dataObj[fieldName]
				);

				// Apply the validated value with proper typing
				validatedData[fieldName] = validatedValue as FieldValueType;
			} catch (error) {
				// Handle errors using type guard
				const validationError = isValidationError(error)
					? error.message
					: error instanceof Error
						? error.message
						: String(error);
				errors.push({ field: fieldName, issues: validationError });
			}
		} else if (dataObj[fieldName] !== undefined) {
			// For fields with values but no validator, apply type conversion
			validatedData[fieldName] = convertValueToFieldType(
				dataObj[fieldName],
				fieldDef,
				fieldName
			);
		}
	}

	// Throw if validation errors
	if (errors.length > 0) {
		throw createValidationError(errors);
	}

	return validatedData as unknown as TOutput;
}

/**
 * Create a Standard Schema compatible validator
 * @param schema Standard Schema validator
 * @returns An object with a validate method
 */
export function createValidator<
	T extends StandardSchemaV1<TInput, TOutput>,
	TInput = unknown,
	TOutput = TInput,
>(schema: T) {
	// Validate schema is a Standard Schema
	assertCondition(
		isStandardSchema(schema),
		'Invalid schema: must be a StandardSchema with ~standard.validate method'
	);

	return {
		validate: async (
			data: FieldValueType
		): Promise<StandardSchemaV1.InferOutput<T>> => {
			let result = schema['~standard'].validate(data);
			if (result instanceof Promise) result = await result;

			// Check if result has issues property
			if ('issues' in result && result.issues) {
				throw createValidationError([
					{ field: 'schema', issues: JSON.stringify(result.issues) },
				]);
			}

			// Handle result with value property
			if ('value' in result) {
				return result.value as StandardSchemaV1.InferOutput<T>;
			}

			// Fallback
			return data as unknown as StandardSchemaV1.InferOutput<T>;
		},
		schema,
	};
}
