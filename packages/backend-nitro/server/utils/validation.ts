import { H3Event, createError } from 'h3';
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

// Extend Zod with OpenAPI functionality
extendZodWithOpenApi(z);

/**
 * Formats a Zod validation error into a consistent error response
 *
 * @param error - The Zod validation error
 * @returns A formatted error object
 */
export function formatZodError(error: z.ZodError) {
	return {
		message: 'Validation error',
		errors: error.errors.map((err) => ({
			path: err.path.join('.'),
			message: err.message,
		})),
	};
}

/**
 * Error response schema for validation errors
 */
export const validationErrorSchema = z.object({
	message: z.string().openapi({
		description: 'Error message',
		example: 'Validation error',
	}),
	errors: z
		.array(
			z.object({
				path: z.string().openapi({
					description: 'Path to the invalid field',
					example: 'field.name',
				}),
				message: z.string().openapi({
					description: 'Validation error message',
					example: 'Required',
				}),
			})
		)
		.openapi({
			description: 'List of validation errors',
		}),
});

/**
 * Validates data against a Zod schema and handles errors consistently
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns The validated data
 * @throws {H3Error} with status 400 if validation fails
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
	try {
		return schema.parse(data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw createError({
				statusCode: 400,
				data: formatZodError(error),
			});
		}
		throw error;
	}
}

/**
 * Creates a validation middleware for request data
 *
 * @param schema - The Zod schema to validate against
 * @returns A validation middleware function
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
	return async (event: H3Event) => {
		const body = await readBody(event);
		return validateSchema(schema, body);
	};
}

/**
 * Helper function to create an OpenAPI parameter schema
 *
 * @param schema - The Zod schema for the parameter
 * @param options - OpenAPI parameter options
 * @returns A Zod schema with OpenAPI metadata
 */
export function createParameterSchema<T extends z.ZodType>(
	schema: T,
	options: {
		name: string;
		in: 'query' | 'path' | 'header' | 'cookie';
		description?: string;
		required?: boolean;
		deprecated?: boolean;
	}
) {
	return schema.openapi({
		param: {
			name: options.name,
			in: options.in,
			required: options.required,
			description: options.description,
			deprecated: options.deprecated,
		},
	});
}
