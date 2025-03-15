import type { ZodSchema } from 'zod';
import { ERROR_CODES } from '../core/error-codes';
import { fail, ok } from '../results/result-helpers';
import type { SDKResult, ValidationErrorDetails } from '../types';

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
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { validationPipeline } from '@doubletie/errors';
 *
 * const userSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 *   age: z.number().min(18),
 * });
 *
 * const validateUser = validationPipeline(
 *   userSchema,
 *   (data) => ({ ...data, createdAt: new Date() })
 * );
 *
 * const result = validateUser(userInput);
 * if (result.isOk()) {
 *   // data is validated and transformed
 *   const user = result.value;
 * } else {
 *   // handle validation error
 *   const error = result.error;
 * }
 * ```
 */
export const validationPipeline = <TInput, TOutput>(
	schema: ZodSchema<TInput>,
	transformer: (data: TInput) => TOutput
): ((data: unknown) => SDKResult<TOutput>) => {
	return (data: unknown) => {
		const parseResult = schema.safeParse(data);

		if (!parseResult.success) {
			const validationErrors: ValidationErrorDetails = {
				validationErrors: parseResult.error.format(),
			};

			return fail('Invalid request data', {
				code: ERROR_CODES.INVALID_REQUEST,
				status: 400,
				meta: validationErrors,
			});
		}

		// Transform the validated data
		try {
			const transformedData = transformer(parseResult.data);
			return ok(transformedData);
		} catch (error) {
			return fail('Failed to process request data', {
				code: ERROR_CODES.BAD_REQUEST,
				status: 400,
				cause: error instanceof Error ? error : undefined,
				meta: { inputData: parseResult.data },
			});
		}
	};
};
