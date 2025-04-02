import type { ZodSchema } from 'zod';
import { ERROR_CODES } from '../core/error-codes';
import { fail, ok } from '../results/result-helpers';
import type { SDKResult } from '../types';

/**
 * Creates a validation pipeline that validates input data with a Zod schema
 * and transforms it to an output format.
 *
 * @template TInput - Type of the input data after validation
 * @template TOutput - Type of the output data after transformation
 *
 * @param schema - Zod schema to validate the input data
 * @param transformer - Function to transform validated data
 * @returns A function that takes input data and returns a Result with the transformed data or an error
 *
 * @remarks
 * This function implements a common pattern for validating and transforming input data.
 * It first validates the input using a Zod schema, and if valid, transforms it using
 * the provided transformer function. If validation fails, it returns a well-structured
 * error with validation details.
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
 * // Define a schema for user input
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
	schema: ZodSchema<TInput>,
	transformer: (data: TInput) => TOutput
): ((data: unknown) => SDKResult<TOutput>) => {
	return (data: unknown) => {
		// Preprocess the data to handle stringified values
		const preprocessData = (value: unknown): unknown => {
			if (typeof value !== 'object' || value === null) {
				// Try parsing stringified JSON values
				if (typeof value === 'string') {
					try {
						// Check if it's a stringified array
						if (value.startsWith('[') && value.endsWith(']')) {
							return JSON.parse(value);
						}
						// Check if it's a stringified boolean
						if (value.toLowerCase() === 'true') {
							return true;
						}
						if (value.toLowerCase() === 'false') {
							return false;
						}
						// Check if it's a stringified object
						if (value.startsWith('{') && value.endsWith('}')) {
							return JSON.parse(value);
						}
					} catch {
						// If parsing fails, return original value
						return value;
					}
				}
				return value;
			}

			// Handle arrays
			if (Array.isArray(value)) {
				return value.map(preprocessData);
			}

			// Handle objects
			const processed: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(value)) {
				processed[key] = preprocessData(val);
			}
			return processed;
		};

		const preprocessedData = preprocessData(data);
		const parseResult = schema.safeParse(preprocessedData);

		if (!parseResult.success) {
			return fail<TOutput>('Validation failed', {
				code: ERROR_CODES.INVALID_REQUEST,
				status: 400,
				meta: {
					validationErrors: parseResult.error.issues,
				},
			});
		}

		try {
			return ok(transformer(parseResult.data));
		} catch (error) {
			return fail<TOutput>('Error transforming data after validation', {
				code: ERROR_CODES.BAD_REQUEST,
				status: 400,
				cause: error instanceof Error ? error : undefined,
				meta: {
					inputData: parseResult.data,
				},
			});
		}
	};
};
