import { getRequestURL } from 'h3';
import { defineValidatedRoute } from '~/utils/define-validated-route';
import { getContext } from '../middleware/context';

export default defineValidatedRoute({
	validations: {},
	handler: async (event) => {
		const context = getContext();
		const url = getRequestURL(event);

		return {
			status: 'ok',
			version: '1.0.0',
			baseUrl: context.baseURL,
			currentUrl: url.pathname,
			endpoints: ['/', '/debug', '/hello', '/status'],
		};
	},
});

defineRouteMeta({
	openAPI: {
		tags: ['System'],
		summary: 'Index',
		description: 'Returns a list of available endpoints',
		responses: {
			'200': {
				description: 'List of available endpoints',
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								endpoints: {
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
});
