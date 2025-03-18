import type { StandardSchemaV1 } from '@standard-schema/spec';
import { ERROR_CODES } from '../core/error-codes';
import { fail, ok } from '../results/result-helpers';
import type { SDKResult, ValidationErrorDetails } from '../types';

/**
 * Creates a validation pipeline that validates input data with a Standard Schema compliant validator
 * and transforms it to an output format.
 *
 * @template TInput - Type of the input data after validation
 * @template TOutput - Type of the output data after transformation
 *
 * @param schema - Standard Schema compliant validator
 * @param transformer - Function to transform validated data
 * @returns A function that takes input data and returns a Result with the transformed data or an error
 *
 * @remarks
 * This function implements a common pattern for validating and transforming input data.
 * It first validates the input using any Standard Schema compliant validator, and if valid,
 * transforms it using the provided transformer function. If validation fails, it returns
 * a well-structured error with validation details.
 *
 * The validation pipeline is particularly useful for:
 * - API request body validation
 * - Form data validation
 * - Configuration validation
 * - Data import/export validation
 *
 * The transformer function allows you to adapt the validated data to the shape
 * expected by your application logic.
 *
 * @see ValidationErrorDetails for the structure of validation errors
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { validationPipeline, ERROR_CODES } from '@doubletie/results';
 *
 * // Define a schema for user input using any Standard Schema compliant validator
 * const userSchema = z.object({
 *   name: z.string().min(2).max(100),
 *   email: z.string().email(),
 *   age: z.number().int().min(18).optional(),
 *   role: z.enum(['admin', 'user', 'guest'])
 * });
 *
 * // Type inferred from schema
 * type UserInput = z.infer<typeof userSchema>;
 *
 * // Type for the transformed output
 * interface UserRecord {
 *   id: string;
 *   displayName: string;
 *   email: string;
 *   age?: number;
 *   role: string;
 *   createdAt: Date;
 * }
 *
 * // Create a validation pipeline
 * const validateUser = validationPipeline<UserInput, UserRecord>(
 *   userSchema,
 *   (validData) => ({
 *     id: generateId(),
 *     displayName: validData.name,
 *     email: validData.email.toLowerCase(),
 *     age: validData.age,
 *     role: validData.role,
 *     createdAt: new Date()
 *   })
 * );
 *
 * // Using the pipeline
 * function createUser(rawData: unknown) {
 *   const result = validateUser(rawData);
 *
 *   return result.match(
 *     (user) => {
 *       // Work with validated and transformed data
 *       return saveUserToDatabase(user);
 *     },
 *     (error) => {
 *       // Handle validation errors
 *       console.error('Validation failed:', error.meta.validationErrors);
 *       throw error;
 *     }
 *   );
 * }
 * ```
 */
export const validationPipeline = <TInput, TOutput>(
	schema: StandardSchemaV1<unknown, TInput>,
	transformer: (data: TInput) => TOutput
): ((data: unknown) => SDKResult<TOutput>) => {
	return (data: unknown) => {
		const validationResult = schema['~standard'].validate(data);

		// Handle both synchronous and asynchronous validation
		if (validationResult instanceof Promise) {
			throw new Error(
				'Asynchronous validation is not supported in the validation pipeline'
			);
		}

		if (validationResult.issues) {
			return fail<TOutput>('Validation failed', {
				code: ERROR_CODES.INVALID_REQUEST,
				status: 400,
				meta: {
					validationErrors: validationResult.issues,
				},
			});
		}

		try {
			return ok(transformer(validationResult.value));
		} catch (error) {
			return fail<TOutput>('Error transforming data after validation', {
				code: ERROR_CODES.BAD_REQUEST,
				status: 400,
				cause: error instanceof Error ? error : undefined,
				meta: {
					inputData: validationResult.value,
				},
			});
		}
	};
};
