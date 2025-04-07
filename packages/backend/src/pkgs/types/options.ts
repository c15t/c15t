import type { DatabaseHook } from '~/pkgs/data-model';
import type { DatabaseConfiguration } from '~/pkgs/db-adapters/adapters/kysely-adapter/types';

import type { Tracer } from '@opentelemetry/api';
import type { H3Event } from 'h3';
// Import table configuration types from the schema module
import type { TablesConfig } from '~/schema/types';
import type { LoggerOptions } from '../logger';
import type { DoubleTiePlugin } from './plugins';

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
export interface DoubleTieOptions {
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
	plugins?: DoubleTiePlugin[];

	/**
	 * Logger configuration
	 * Controls how events are logged
	 */
	logger?: LoggerOptions;

	/**
	 * allows you to define custom hooks that can be
	 * executed during lifecycle of core database
	 * operations.
	 */
	databaseHooks?: DatabaseHook[];

	/**
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
		 * Function to generate IDs
		 * Custom ID generation for records and other entities
		 */
		generateId?: (options: { model: string; size?: number }) => string;

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
	 * OpenTelemetry configuration for observability
	 *
	 * Controls how telemetry data is collected and exported, allowing
	 * users to integrate with their own observability stack.
	 *
	 * @example
	 * ```typescript
	 * // Basic configuration
	 * telemetry: {
	 *   disabled: false,
	 *   defaultAttributes: {
	 *     'deployment.environment': 'production'
	 *   }
	 * }
	 * ```
	 *
	 * @example
	 * ```typescript
	 * // Using a custom tracer
	 * import { trace } from '@opentelemetry/api';
	 *
	 * const tracer = trace.getTracer('my-custom-tracer');
	 *
	 * telemetry: {
	 *   tracer,
	 *   defaultAttributes: {
	 *     'service.instance.id': instanceId
	 *   }
	 * }
	 * ```
	 */
	telemetry?: {
		/**
		 * Custom OpenTelemetry tracer to use
		 *
		 * If provided, this tracer will be used instead of creating a new one.
		 * This allows for integration with existing OpenTelemetry setups.
		 */
		tracer?: Tracer;

		/**
		 * Whether to disable telemetry collection
		 *
		 * When set to true, no telemetry data will be collected or exported.
		 * Useful for development environments or when running tests.
		 *
		 * @default false
		 */
		disabled?: boolean;

		/**
		 * Default attributes to add to all telemetry spans
		 *
		 * These attributes will be added to every span created by the system,
		 * useful for adding environment, deployment, or instance information.
		 *
		 * Required attributes like 'service.name' and 'service.version' will be
		 * automatically added based on application configuration.
		 */
		defaultAttributes?: Record<string, string | number | boolean>;
	};

	/**
	 * Database tables configuration
	 * Contains all entity table configurations
	 */
	tables?: TablesConfig;

	/**
	 * Any additional options
	 */
	[key: string]: unknown;
}

/**
 * Middleware function for processing API requests
 */
export type DoubleTieMiddleware = (
	event: H3Event,
	next: () => Promise<unknown>
) => Promise<unknown>;

/**
 * Advanced configuration options
 */
export interface AdvancedOptions {
	/**
	 * Custom ID generator function
	 */
	generateId?: (options: { model: string; size?: number }) => string;

	/**
	 * IP address configuration
	 */
	ipAddress?: {
		/**
		 * Whether to disable IP tracking
		 */
		disableIpTracking?: boolean;

		/**
		 * Headers to use for IP address detection
		 */
		ipAddressHeaders?: string[];
	};

	/**
	 * Any other advanced options
	 */
	[key: string]: unknown;
}

/**
 * Telemetry configuration options
 */
export interface TelemetryOptions {
	/**
	 * Custom tracer to use
	 */
	tracer?: Tracer;

	/**
	 * Whether to disable telemetry
	 */
	disabled?: boolean;

	/**
	 * Default attributes to add to all spans
	 */
	defaultAttributes?: Record<string, string | number | boolean>;
}
