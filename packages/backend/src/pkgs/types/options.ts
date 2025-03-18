import type { DoubleTieMiddleware } from '~/pkgs/api-router';
import type { DatabaseHook, EntityName } from '~/pkgs/data-model';
import type { DatabaseConfiguration } from '~/pkgs/db-adapters/adapters/kysely-adapter/types';
import type { Logger } from '~/pkgs/logger';
import type { DoubleTieContext } from './context';
import type { DoubleTiePlugin } from './plugins';

// Import table configuration types from the schema module
import type { TablesConfig } from '~/schema/types';

/**
 * Main configuration options for the DoubleTie SDK framework
 *
 * This interface provides a comprehensive set of options for configuring
 * all aspects of the framework, including core functionality,
 * database settings, UI components, and plugin extensions.
 *
 * @typeParam P - Array of plugin types to be used with this configuration
 *
 * @example
 * ```ts
 * // Basic configuration
 * const options: DoubleTieOptions = {
 *   appName: "My App",
 *   secret: process.env.SECRET_KEY,
 *   baseURL: "https://example.com",
 *   trustedOrigins: ["https://example.com"]
 * };
 * ```
 */
export interface DoubleTieOptions<
	P extends DoubleTiePlugin[] = DoubleTiePlugin[],
> {
	/**
	 * The base URL for the API (optional if running in a browser)
	 * @example "https://example.com"
	 */
	baseURL?: string;

	/**
	 * The base path for API endpoints
	 * @default "/api/c15t"
	 * @example "/api/c15t"
	 */
	basePath?: string;

	/**
	 * Application name shown in application dialogs
	 * @example "My App"
	 */
	appName?: string;

	/**
	 * Secret used for signing cookies and tokens
	 * Should be a strong, unique string in production environments
	 */
	secret?: string;

	/**
	 * Database configuration
	 */
	database?: DatabaseConfiguration;

	/**
	 * Enable CORS support
	 * @default true
	 */
	cors?: boolean;

	/**
	 * Trusted origins for CORS
	 * Can be an array of origin strings or a function that returns origins based on the request
	 * @example ["https://example.com", "https://www.example.com"]
	 */
	trustedOrigins?: string[] | ((request: Request) => string[]);

	/**
	 * Plugins to extend functionality
	 * Array of plugin objects that add features to the system
	 */
	plugins?: P;

	/**
	 * Logger configuration
	 * Controls how events are logged
	 */
	logger?: Logger;

	/**
	 * allows you to define custom hooks that can be
	 * executed during lifecycle of core database
	 * operations.
	 */
	databaseHooks?: DatabaseHook[];
	/*
	 * Advanced configuration options
	 * Settings for specialized use cases
	 */
	advanced?: {
		/**
		 * Ip address configuration
		 */
		ipAddress?: {
			/**
			 * List of headers to use for ip address
			 *
			 * Ip address is used for rate limiting and session tracking
			 *
			 * @example ["x-client-ip", "x-forwarded-for"]
			 *
			 * @default
			 * @link https://github.com/c15t/c15t/blob/main/packages/c15t/src/utils/get-request-ip.ts#L8
			 */
			ipAddressHeaders?: string[];
			/**
			 * Disable ip tracking
			 *
			 * ⚠︎ This is a security risk and it may expose your application to abuse
			 */
			disableIpTracking?: boolean;
		};

		/**
		 * Disable trusted origins check
		 *
		 * ⚠︎ This is a security risk and it may expose your application to CSRF attacks
		 */
		disableCSRFCheck?: boolean;

		/**
		 * Function to generate IDs
		 * Custom ID generation for records and other entities
		 */
		generateId?: (options: { model: EntityName; size?: number }) => string;

		/**
		 * Disable database transactions
		 *
		 * When true, operations will execute directly without transaction support.
		 * Useful for databases that don't support transactions or when you want to bypass transaction overhead.
		 *
		 * @default false
		 */
		disableTransactions?: boolean;
	};
	/**
	 * API error handling
	 */
	onAPIError?: {
		/**
		 * Throw an error on API error
		 *
		 * @default false
		 */
		throw?: boolean;
		/**
		 * Custom error handler
		 *
		 * @param error
		 * @param ctx - Auth context
		 */
		onError?: (error: unknown, ctx: DoubleTieContext) => void | Promise<void>;
	};
	/**
	 * Hooks
	 */
	hooks?: {
		/**
		 * Before a request is processed
		 */
		before?: DoubleTieMiddleware;
		/**
		 * After a request is processed
		 */
		after?: DoubleTieMiddleware;
	};

	/**
	 * Database tables configuration
	 * Contains all entity table configurations
	 */
	tables?: TablesConfig;
}
