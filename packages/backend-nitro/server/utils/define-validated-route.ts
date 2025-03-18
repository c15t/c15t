import { Logger } from '@doubletie/logger';
import {
	H3Event,
	H3EventContext,
	defineEventHandler,
	getQuery,
	getRouterParams,
	readBody,
	setResponseStatus,
} from 'h3';
import type { ZodType, z } from 'zod';
import { logger } from './logger';

type ValidatedData<B, Q, P> = {
	body: B extends ZodType ? z.infer<B> : undefined;
	query: Q extends ZodType ? z.infer<Q> : undefined;
	params: P extends ZodType ? z.infer<P> : undefined;
};

type ValidatedContext<B, Q, P> = H3EventContext & {
	logger: Logger;
	validated: ValidatedData<B, Q, P>;
};

type ValidatedEvent<B, Q, P> = Omit<H3Event, 'context'> & {
	context: ValidatedContext<B, Q, P>;
};

interface ValidationConfig<
	B extends ZodType | undefined,
	Q extends ZodType | undefined,
	P extends ZodType | undefined,
> {
	body?: B;
	query?: Q;
	params?: P;
}

type InferValidatedEvent<
	B extends ZodType | undefined,
	Q extends ZodType | undefined,
	P extends ZodType | undefined,
> = ValidatedEvent<B, Q, P>;

/**
 * Creates a route handler with automatic Zod validation for body, query, and route parameters
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
	B extends ZodType | undefined = undefined,
	Q extends ZodType | undefined = undefined,
	P extends ZodType | undefined = undefined,
>(config: {
	validations?: ValidationConfig<B, Q, P>;
	handler: (event: InferValidatedEvent<B, Q, P>) => Promise<unknown>;
}) {
	return defineEventHandler(async (event) => {
		const errors = new Map<string, z.ZodError>();
		const validated = {
			body: undefined,
			query: undefined,
			params: undefined,
		} as ValidatedData<B, Q, P>;

		if (config.validations?.body) {
			const body = await readBody(event);
			const result = config.validations.body.safeParse(body);
			if (!result.success) errors.set('body', result.error);
			else validated.body = result.data;
		}

		if (config.validations?.query) {
			const query = getQuery(event);
			const result = config.validations.query.safeParse(query);
			if (!result.success) errors.set('query', result.error);
			else validated.query = result.data;
		}

		if (config.validations?.params) {
			const params = getRouterParams(event);
			const result = config.validations.params.safeParse(params);
			if (!result.success) errors.set('params', result.error);
			else validated.params = result.data;
		}

		if (errors.size > 0) {
			setResponseStatus(event, 422);
			return {
				success: false,
				errors: Object.fromEntries(errors),
			} as const;
		}

		const eventWithContext = {
			...event,
			context: {
				...event.context,
				validated,
				logger: logger(),
			},
		} as InferValidatedEvent<B, Q, P>;

		return config.handler(eventWithContext);
	});
}
