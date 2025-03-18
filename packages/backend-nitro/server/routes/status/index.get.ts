import { defineValidatedRoute } from '~/utils/define-validated-route';

defineRouteMeta({
	openAPI: {
		tags: ['System'],
		summary: 'Server Status',
		description: 'Returns the current status of the server',
		responses: {
			'200': {
				description: 'Server status information',
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								status: {
									type: 'string',
									description: 'Server status',
									example: 'ok',
								},
								time: {
									type: 'string',
									format: 'date-time',
									description: 'Current server time',
								},
								version: {
									type: 'string',
									description: 'Server version',
								},
							},
							required: ['status', 'time'],
						},
					},
				},
			},
		},
	},
});

/**
 * Status endpoint that returns the basic health status of the server
 * @returns Object containing server status and time
 */
export default defineValidatedRoute({
	handler: async () => {
		return {
			status: 'ok',
			time: new Date().toISOString(),
			version: process.env.npm_package_version || '0.0.0',
		};
	},
});
