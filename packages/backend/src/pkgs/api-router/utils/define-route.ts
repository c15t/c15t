import type { H3Event, H3EventContext, RouterMethod } from 'h3';
import {
	createError,
	defineEventHandler,
	getQuery as h3GetQuery,
	getRouterParams as h3GetRouterParams,
	readBody,
} from 'h3';
import type { ZodType, z } from 'zod';
import { createLogger } from '~/pkgs/logger';
import {
	DoubleTieError,
	ERROR_CODES,
	validationPipeline,
} from '~/pkgs/results';
import type { Route } from '~/routes/types';
import type {
	Endpoint,
	EndpointHandler,
	EndpointOptions,
} from '../../types/endpoints';

// Define more precise types for validation data
type ValidatedData<
	TBody extends ZodType | undefined,
	TQuery extends ZodType | undefined,
	TParams extends ZodType | undefined,
> = {
	body: TBody extends ZodType ? z.infer<TBody> : undefined;
	query: TQuery extends ZodType ? z.infer<TQuery> : undefined;
	params: TParams extends ZodType ? z.infer<TParams> : undefined;
};

type ValidatedContext<
	TBody extends ZodType | undefined,
	TQuery extends ZodType | undefined,
	TParams extends ZodType | undefined,
> = H3EventContext & {
	validated: ValidatedData<TBody, TQuery, TParams>;
};

type ValidatedEvent<
	TBody extends ZodType | undefined,
	TQuery extends ZodType | undefined,
	TParams extends ZodType | undefined,
> = Omit<H3Event, 'context'> & {
	context: ValidatedContext<TBody, TQuery, TParams>;
};

/**
 * Defines a type-safe API route with validation and proper error handling
 *
 * This utility function creates a complete API route definition with:
 * - Path and method definition
 * - Request validation (body, query params, path params)
 * - Consistent error handling
 * - Type-safe response handling
 *
 * @param config - Configuration for the route including path, method, validations and handler
 * @returns A Route object that can be used in the router
 *
 * @example
 * ```ts
 * // Define a route with validation and type-safe response
 * export const createUser = defineRoute<UserResponse, UserSchema>({
 *   path: '/users',
 *   method: 'post',
 *   validations: {
 *     body: UserSchema,
 *   },
 *   handler: async (event) => {
 *     const { body } = event.context.validated;
 *     // Implementation...
 *     return { id: newUser.id, name: body.name, email: body.email };
 *   }
 * });
 * ```
 */
export function defineRoute<
	TResponse,
	TBodySchema extends ZodType = never,
	TQuerySchema extends ZodType = never,
	TParamsSchema extends ZodType = never,
>(config: {
	path: string;
	method: RouterMethod;
	validations?: {
		body?: TBodySchema;
		query?: TQuerySchema;
		params?: TParamsSchema;
	};
	handler: (
		event: ValidatedEvent<
			TBodySchema extends never ? undefined : TBodySchema,
			TQuerySchema extends never ? undefined : TQuerySchema,
			TParamsSchema extends never ? undefined : TParamsSchema
		>
	) => Promise<TResponse>;
}): Route & { responseType: TResponse };

/**
 * Creates a simple endpoint with optional middleware
 *
 * @param path - The path for this endpoint
 * @param handler - Handler function for the endpoint
 * @param options - Optional configuration options
 * @returns An Endpoint object
 */
export function defineRoute(
	path: string,
	handler: EndpointHandler,
	options?: EndpointOptions
): Endpoint;

// Implementation
export function defineRoute<
	TResponse = unknown,
	TBodySchema extends ZodType = never,
	TQuerySchema extends ZodType = never,
	TParamsSchema extends ZodType = never,
>(
	pathOrConfig:
		| string
		| {
				path: string;
				method: RouterMethod;
				validations?: {
					body?: TBodySchema;
					query?: TQuerySchema;
					params?: TParamsSchema;
				};
				handler: (
					event: ValidatedEvent<
						TBodySchema extends never ? undefined : TBodySchema,
						TQuerySchema extends never ? undefined : TQuerySchema,
						TParamsSchema extends never ? undefined : TParamsSchema
					>
				) => Promise<TResponse>;
		  },
	handlerOrUndefined?: EndpointHandler,
	options?: EndpointOptions
): (Route & { responseType: TResponse }) | Endpoint {
	// Simple endpoint case
	if (typeof pathOrConfig === 'string' && handlerOrUndefined) {
		// Create an endpoint directly with H3 patterns
		return {
			path: pathOrConfig,
			handler: handlerOrUndefined,
			options,
		};
	}

	// Full route definition case
	const config = pathOrConfig as {
		path: string;
		method: RouterMethod;
		validations?: {
			body?: TBodySchema;
			query?: TQuerySchema;
			params?: TParamsSchema;
		};
		handler: (
			event: ValidatedEvent<
				TBodySchema extends never ? undefined : TBodySchema,
				TQuerySchema extends never ? undefined : TQuerySchema,
				TParamsSchema extends never ? undefined : TParamsSchema
			>
		) => Promise<TResponse>;
	};

	const handler = defineEventHandler(async (event) => {
		const logger = event.context.logger || createLogger();
		const validated = {
			body: undefined,
			query: undefined,
			params: undefined,
		} as ValidatedData<
			TBodySchema extends never ? undefined : TBodySchema,
			TQuerySchema extends never ? undefined : TQuerySchema,
			TParamsSchema extends never ? undefined : TParamsSchema
		>;

		try {
			// Validate body if schema provided
			if (config.validations?.body) {
				const body = await readBody(event);
				logger.debug('Validating request body', { body });
				const validateBody = validationPipeline(
					config.validations.body,
					(data) => data
				);
				const result = await validateBody(body);
				result.match(
					(data) => {
						validated.body = data;
					},
					(error) => {
						logger.warn('Body validation failed', { error });
						throw createError({
							statusCode: 422,
							statusMessage: 'Body validation failed',
							data: error,
						});
					}
				);
			}

			// Validate query if schema provided
			if (config.validations?.query) {
				const query = getQuery(event);
				logger.debug('Validating query parameters', { query });
				const validateQuery = validationPipeline(
					config.validations.query,
					(data) => data
				);
				const result = await validateQuery(query);
				result.match(
					(data) => {
						validated.query = data;
					},
					(error) => {
						logger.warn('Query validation failed', { error });
						throw createError({
							statusCode: 422,
							statusMessage: 'Query validation failed',
							data: error,
						});
					}
				);
			}

			// Validate params if schema provided
			if (config.validations?.params) {
				const params = getRouterParams(event);
				logger.debug('Validating route parameters', { params });
				const validateParams = validationPipeline(
					config.validations.params,
					(data) => data
				);
				const result = await validateParams(params);
				result.match(
					(data) => {
						validated.params = data;
					},
					(error) => {
						logger.warn('Path parameters validation failed', { error });
						throw createError({
							statusCode: 422,
							statusMessage: 'Path parameters validation failed',
							data: error,
						});
					}
				);
			}

			// Create event with validated context
			const eventWithContext = event as ValidatedEvent<
				TBodySchema extends never ? undefined : TBodySchema,
				TQuerySchema extends never ? undefined : TQuerySchema,
				TParamsSchema extends never ? undefined : TParamsSchema
			>;

			eventWithContext.context = {
				...event.context,
				validated,
			};

			return await config.handler(eventWithContext);
		} catch (error) {
			// If it's already a DoubleTieError, rethrow it
			if (error instanceof DoubleTieError) {
				throw error;
			}

			// Otherwise, wrap it in a DoubleTieError
			logger.error('Validation failed', { error });

			// Extract validation details for better error messages
			let validationErrors: unknown = 'Unknown validation error';

			if (error instanceof Error) {
				validationErrors = error.message;

				// Handle Zod validation errors more comprehensively
				if (
					error.name === 'ZodError' &&
					'format' in error &&
					typeof error.format === 'function'
				) {
					try {
						validationErrors = error.format();
					} catch {
						// If formatting fails, fall back to the error message
						validationErrors = `Validation error: ${error.message}`;
					}
				}
			}

			throw new DoubleTieError('Validation failed', {
				code: ERROR_CODES.BAD_REQUEST,
				status: 422,
				cause: error instanceof Error ? error : undefined,
				meta: {
					validationErrors,
					requestPath: config.path,
					requestMethod: config.method,
				},
			});
		}
	});

	return {
		path: config.path,
		method: config.method,
		handler,
		responseType: {} as TResponse, // This is just for type information, not used at runtime
	};
}

/**
 * Extracts the response type from a route definition
 *
 * This utility type allows extracting the response type from a route defined
 * with defineRoute for use in client-side code.
 *
 * @example
 * ```ts
 * // Server-side route definition
 * export const getUser = defineRoute<UserResponse>({...});
 *
 * // Client-side type usage
 * type UserResponse = RouteResponseType<typeof getUser>;
 * ```
 */
export type RouteResponseType<T extends Route & { responseType: unknown }> =
	T extends Route & { responseType: infer R } ? R : never;

// Helper functions for getting parameters in a type-safe way
function getQuery(event: H3Event): Record<string, unknown> {
	return h3GetQuery(event);
}

function getRouterParams(event: H3Event): Record<string, unknown> {
	return h3GetRouterParams(event) || {};
}
