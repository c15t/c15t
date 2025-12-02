import type { C15TOptions } from '~/types';
import { version } from '~/version';
/**
 * Default OpenAPI configuration
 */
export const createOpenAPIConfig = (options: C15TOptions) => {
	const basePath = options.basePath || '';
	return {
		enabled: true,
		specPath: `${basePath}/spec.json`,
		docsPath: `${basePath}/docs`,
		...(options.advanced?.openapi || {}),
	};
};

/**
 * Default OpenAPI options
 */
export const createDefaultOpenAPIOptions = (options: C15TOptions) => ({
	info: {
		title: options.appName || 'c15t API',
		version,
		description: 'API for consent management',
	},
	servers: [{ url: options.basePath || '/' }],
	security: [{ bearerAuth: [] }],
});
