import { Logger } from '@doubletie/logger';
import {
	DoubleTieError,
	ERROR_CODES,
	validationPipeline,
} from '@doubletie/results';
import {
	H3Event,
	H3EventContext,
	defineEventHandler,
	getQuery,
	getRouterParams,
	readBody,
} from 'h3';
import type { ZodType, z } from 'zod';
import { logger } from './logger';

type ValidatedData<TBody, TQuery, TParams> = {
	body: TBody extends ZodType ? z.infer<TBody> : undefined;
	query: TQuery extends ZodType ? z.infer<TQuery> : undefined;
	params: TParams extends ZodType ? z.infer<TParams> : undefined;
};

type ValidatedContext<TBody, TQuery, TParams> = H3EventContext & {
	logger: Logger;
	validated: ValidatedData<TBody, TQuery, TParams>;
};

type ValidatedEvent<TBody, TQuery, TParams> = Omit<H3Event, 'context'> & {
	context: ValidatedContext<TBody, TQuery, TParams>;
};

interface ValidationConfig<
	TBody extends ZodType | undefined,
	TQuery extends ZodType | undefined,
	TParams extends ZodType | undefined,
> {
	body?: TBody;
	query?: TQuery;
	params?: TParams;
}

type InferValidatedEvent<
	TBody extends ZodType | undefined,
	TQuery extends ZodType | undefined,
	TParams extends ZodType | undefined,
> = ValidatedEvent<TBody, TQuery, TParams>;

/**
 * Creates a route handler with automatic validation using @doubletie/results
 *
 * @param config - Configuration object containing validation schemas and the handler function
 * @returns An H3 event handler with validation
 *
 * @example
 * ```ts
 * export default defineValidatedRoute({
 *   validations: {
 *     query: z.object({ name: z.string() }),
 *     body: z.object({ age: z.number() })
 *   },
 *   handler: async (event) => {
 *     const { query, body } = event.context.validated;
 *     return { message: `Hello ${query.name}, you are ${body.age} years old` };
 *   }
 * });
 * ```
 */
export function defineValidatedRoute<
	TBody extends ZodType | undefined = undefined,
	TQuery extends ZodType | undefined = undefined,
	TParams extends ZodType | undefined = undefined,
>(config: {
	validations?: ValidationConfig<TBody, TQuery, TParams>;
	handler: (
		event: InferValidatedEvent<TBody, TQuery, TParams>
	) => Promise<unknown>;
}) {
	return defineEventHandler(async (event) => {
		const validated = {
			body: undefined,
			query: undefined,
			params: undefined,
		} as ValidatedData<TBody, TQuery, TParams>;

		try {
			// Validate body if schema provided
			if (config.validations?.body) {
				const body = await readBody(event);
				const validateBody = validationPipeline(
					config.validations.body,
					(data) => data
				);
				const result = validateBody(body);
				result.match(
					(data) => {
						validated.body = data;
					},
					(error) => {
						throw error;
					}
				);
			}

			// Validate query if schema provided
			if (config.validations?.query) {
				const query = getQuery(event);
				const validateQuery = validationPipeline(
					config.validations.query,
					(data) => data
				);
				const result = validateQuery(query);
				result.match(
					(data) => {
						validated.query = data;
					},
					(error) => {
						throw error;
					}
				);
			}

			// Validate params if schema provided
			if (config.validations?.params) {
				const params = getRouterParams(event);
				const validateParams = validationPipeline(
					config.validations.params,
					(data) => data
				);
				const result = validateParams(params);
				result.match(
					(data) => {
						validated.params = data;
					},
					(error) => {
						throw error;
					}
				);
			}

			// Create event with validated context
			const eventWithContext = {
				...event,
				context: {
					...event.context,
					validated,
					logger: logger(),
				},
			} as InferValidatedEvent<TBody, TQuery, TParams>;

			return await config.handler(eventWithContext);
		} catch (error) {
			// If it's already a DoubleTieError, rethrow it
			if (error instanceof DoubleTieError) {
				throw error;
			}

			// Otherwise, wrap it in a DoubleTieError
			throw new DoubleTieError('Validation failed', {
				code: ERROR_CODES.BAD_REQUEST,
				status: 422,
				cause: error instanceof Error ? error : undefined,
				meta: {
					validationErrors:
						error instanceof Error ? error.message : 'Unknown validation error',
				},
			});
		}
	});
}
