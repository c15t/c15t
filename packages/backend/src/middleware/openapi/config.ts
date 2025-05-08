import type { C15TOptions } from '~/types';
import packageJson from '../../../package.json';

/**
 * Default OpenAPI configuration
 */
export const createOpenAPIConfig = (options: C15TOptions) => ({
	enabled: true,
	specPath: '/spec.json',
	docsPath: '/docs',
	...(options.openapi || {}),
});

/**
 * Default OpenAPI options
 */
export const createDefaultOpenAPIOptions = (options: C15TOptions) => ({
	info: {
		title: options.appName || 'c15t API',
		version: packageJson.version,
		description: 'API for consent management',
	},
	servers: [{ url: '/' }],
	security: [{ bearerAuth: [] }],
});
