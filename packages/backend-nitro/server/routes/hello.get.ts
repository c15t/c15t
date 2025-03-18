import { z } from 'zod';
import { defineValidatedRoute } from '~/utils/define-validated-route';

/**
 * Schema for validating the hello endpoint query parameters
 */
const querySchema = z.object({
	name: z
		.string({ message: 'Name must be a string' })
		.min(1, { message: 'Name is required' })
		.max(50, { message: 'Name must be less than 50 characters' })
		.default('Guest'),
});

/**
 * Route meta for the hello endpoint
 */
defineRouteMeta({
	openAPI: {
		tags: ['Greetings'],
		summary: 'Hello endpoint',
		description:
			'Returns a greeting with the provided name or "Guest" if not provided',
		parameters: [
			{
				name: 'name',
				in: 'query' as const,
				required: false,
				schema: {
					type: 'string',
					default: 'Guest',
				},
				description: 'Name to use in greeting',
			},
		],
		responses: {
			'200': {
				description: 'Successful greeting response',
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								message: {
									type: 'string',
									description: 'The greeting message',
									example: 'Hello Guest!',
								},
								timestamp: {
									type: 'string',
									format: 'date-time',
									description: 'The time the greeting was generated',
								},
							},
							required: ['message', 'timestamp'],
						},
					},
				},
			},
			'422': {
				description: 'Validation error',
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								success: {
									type: 'boolean',
									example: false,
								},
								errors: {
									type: 'object',
									additionalProperties: {
										type: 'object',
										properties: {
											issues: {
												type: 'array',
												items: {
													type: 'object',
													properties: {
														code: { type: 'string' },
														message: { type: 'string' },
														path: {
															type: 'array',
															items: { type: 'string' },
														},
													},
												},
											},
										},
									},
								},
							},
							required: ['success', 'errors'],
						},
					},
				},
			},
		},
	},
});

/**
 * Hello endpoint that returns a greeting with the provided name or "Guest" if not provided
 */
export default defineValidatedRoute({
	validations: {
		query: querySchema,
	},
	handler: async (event) => {
		const { query } = event.context.validated;
		return {
			message: `Hello ${query.name}!`,
			timestamp: new Date().toISOString(),
		};
	},
});
