import type { C15TOptions } from '~/types';
import { version } from '~/version';
/**
 * Default OpenAPI configuration
 *
 * Note: specPath and docsPath should NOT include the basePath,
 * as the basePath is stripped from incoming requests before routing.
 */
export const createOpenAPIConfig = (options: C15TOptions) => {
	return {
		enabled: options.advanced?.openapi?.enabled !== false,
		specPath: '/spec.json',
		docsPath: '/docs',
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
