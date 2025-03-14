import { createAuthEndpoint } from '~/pkgs/api-router/call';
import { HIDE_METADATA } from '~/utils/hide-metadata';

export const ok = createAuthEndpoint(
	'/ok',
	{
		method: 'GET',
		metadata: {
			...HIDE_METADATA,
			openapi: {
				description: 'Check if the API is working',
				responses: {
					'200': {
						description: 'Success',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										ok: {
											type: 'boolean',
										},
										version: {
											type: 'string',
										},
										timestamp: {
											type: 'string',
										},
									},
								},
							},
						},
					},
				},
			},
		},
	},
	async (ctx) => {
		return ctx.json({
			ok: true,
			version: process.env.API_VERSION || '1.0.0',
			timestamp: new Date().toISOString(),
		});
	}
);
