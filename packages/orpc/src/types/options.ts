import type { OpenAPIGeneratorOptions } from '@orpc/openapi';
/**
 * c15t Consent Management System Configuration Types
 *
 * This module defines the configuration options for the c15t consent management system.
 * It includes types for setting up storage, API endpoints, cookies, rate limiting,
 * analytics, geo-targeting, plugins, logging, and other advanced features.
 */
import type { DoubleTieOptions } from '~/pkgs/types/options';
import type { C15TPlugin } from './plugins';

import type { LoggerOptions } from '~/pkgs/logger';
// Import table configuration types from the schema module
import type { TablesConfig } from '~/schema/types';
/**
 * Main configuration options for the c15t consent management system
 *
 * This interface extends the base DoubleTie options with additional options
 * specific to consent management functionality.
 *
 * @typeParam PluginType - Array of plugin types to be used with this configuration
 *
 * @example
 * ```ts
 * // Basic consent management configuration
 * const options: C15TOptions = {
 *   appName: "My Consent App",
 *   baseURL: "https://example.com",
 *   trustedOrigins: ["https://example.com"]
 * };
 * ```
 */
export interface C15TOptions<PluginType extends C15TPlugin[] = C15TPlugin[]>
	extends Omit<DoubleTieOptions, 'plugins'> {
	/**
	 * The base URL for the API
	 */
	baseURL?: string;

	/**
	 * Trusted origins for CORS
	 */
	trustedOrigins?: string[];

	/**
	 * Application name shown in application dialogs
	 */
	appName?: string;

	/**
	 * Secret used for signing cookies and tokens
	 */
	secret?: string;

	/**
	 * Plugins specific to C15T
	 */
	plugins?: PluginType;

	/**
	 * Tables configuration
	 */
	tables?: TablesConfig;

	/**
	 * Logger configuration
	 */
	logger?: LoggerOptions;

	/**
	 * OpenAPI configuration options
	 */
	openapi?: {
		/**
		 * Enable/disable OpenAPI spec generation
		 * @default true
		 */
		enabled?: boolean;

		/**
		 * Path to serve the OpenAPI JSON spec
		 * @default "/spec.json"
		 */
		specPath?: string;

		/**
		 * Path to serve the API documentation UI
		 * @default "/docs"
		 */
		docsPath?: string;

		/**
		 * OpenAPI specification options
		 * These are passed to the OpenAPIGenerator.generate() method
		 */
		options?: Partial<OpenAPIGeneratorOptions>;

		/**
		 * Custom template for rendering the API documentation UI
		 * If provided, this will be used instead of the default Scalar UI
		 */
		customUiTemplate?: string;
	};
}
