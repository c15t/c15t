import { defineValidatedRoute } from '~/utils/define-validated-route';
import { getContext } from '../middleware/context';

defineRouteMeta({
	openAPI: {
		tags: ['System'],
		summary: 'Debug Information',
		description:
			'Returns debug information about the server (only available in development)',
		responses: {
			'200': {
				description: 'Debug information',
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								status: {
									type: 'string',
									enum: ['ok', 'error'],
									description: 'Status of the debug request',
								},
								initialized: {
									type: 'boolean',
									description: 'Whether the context is initialized',
								},
								context: {
									type: 'object',
									properties: {
										baseURL: {
											type: 'string',
											description: 'Base URL of the server',
										},
									},
								},
								middleware: {
									type: 'object',
									properties: {
										originCheck: {
											type: 'object',
											properties: {
												enabled: {
													type: 'boolean',
													description: 'Whether origin checking is enabled',
												},
												skipPaths: {
													type: 'array',
													items: { type: 'string' },
													description: 'Paths that skip origin checking',
												},
												allowedDomains: {
													type: 'array',
													items: { type: 'string' },
													description:
														'Additional allowed domains for origin checking',
												},
											},
										},
										logger: {
											type: 'object',
											properties: {
												level: {
													type: 'string',
													description: 'Current log level',
												},
												name: {
													type: 'string',
													description: 'Logger name',
												},
												meta: {
													type: 'object',
													description: 'Logger metadata',
												},
											},
										},
									},
								},
								env: {
									type: 'object',
									properties: {
										NODE_ENV: {
											type: 'string',
											description: 'Current environment',
										},
										C15T_BASE_URL: {
											type: 'string',
											description: 'Base URL configuration',
										},
									},
								},
							},
							required: ['status'],
						},
					},
				},
			},
			'403': {
				description: 'Debug endpoint not available in production',
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								status: {
									type: 'string',
									enum: ['error'],
								},
								message: {
									type: 'string',
								},
							},
							required: ['status', 'message'],
						},
					},
				},
			},
		},
	},
});

/**
 * Debug endpoint to check server configuration and middleware status
 * Only available in development mode
 */
export default defineValidatedRoute({
	handler: async (event) => {
		// Only allow in development
		if (process.env.NODE_ENV !== 'development') {
			event.context.logger.warn(
				'Debug endpoint accessed in non-development environment'
			);
			return {
				status: 'error',
				message: 'Debug endpoint only available in development mode',
			};
		}

		try {
			const context = getContext();
			const config = useRuntimeConfig();

			// Log debug access
			context.logger.info('Debug endpoint accessed', {
				ip: event.node.req.socket.remoteAddress || '0.0.0.0',
				userAgent: event.node.req.headers['user-agent'] || 'unknown',
			});

			return {
				status: 'ok',
				initialized: true,
				context: {
					logger: context.logger ? '@doubletie/logger' : 'no logger',
					baseURL: context.baseURL,
				},
				middleware: {
					originCheck: {
						enabled: config.c15t.originCheck.enabled,
						skipPaths: config.c15t.originCheck.skipPaths,
						allowedDomains: config.c15t.originCheck.allowedDomains,
					},
				},
				env: {
					NODE_ENV: process.env.NODE_ENV,
					C15T_BASE_URL: process.env.C15T_BASE_URL,
				},
			};
		} catch (error) {
			const context = getContext();
			context.logger.error('Error in debug endpoint', { error });
			return {
				status: 'error',
				initialized: false,
				message: error instanceof Error ? error.message : 'Unknown error',
				env: {
					NODE_ENV: process.env.NODE_ENV,
					C15T_BASE_URL: process.env.C15T_BASE_URL,
				},
			};
		}
	},
});
