import type { H3Event } from 'h3';
import type { DatabaseHook, EntityName } from '~/pkgs/data-model';
import type { Adapter } from '~/pkgs/db-adapters/types';
import type { createLogger } from '~/pkgs/logger';
import type { createRegistry } from '~/schema/create-registry';
import type { getConsentTables } from '~/schema/definition';
import type { DoubleTieOptions } from './options';

/**
 * Extended endpoint context for hooks
 *
 * This type extends the standard endpoint context with additional properties
 * specific to DoubleTie hooks, allowing hooks to access the complete DoubleTie context.
 */
export type HookEndpointContext = H3Event & {
	/**
	 * The DoubleTie context with possible hook-specific extensions
	 */
	context: DoubleTieContext & {
		/**
		 * Value returned by the endpoint handler, available in 'after' hooks
		 */
		returned?: unknown;

		/**
		 * Response headers, available in 'after' hooks
		 */
		responseHeaders?: Headers;
	};
};

/**
 * Generic endpoint context type
 *
 * A simplified context type for endpoint handlers that don't need
 * access to input-specific context properties.
 */
export type GenericEndpointContext = H3Event & {
	/**
	 * The DoubleTie application context
	 */
	context: DoubleTieContext;
};

/**
 * Base context interface
 *
 * Defines the minimal required properties for a DoubleTie context.
 */
export interface BaseContext {
	/**
	 * Configuration options for the DoubleTie system
	 */
	options: DoubleTieOptions;

	/**
	 * Logger instance for recording events and errors
	 */
	logger: ReturnType<typeof createLogger>;
}

/**
 * Registry context interface
 *
 * Extends the base context with registry-specific properties
 * for database access and entity management.
 */
export interface RegistryContext extends BaseContext {
	/**
	 * Database adapter instance
	 */
	adapter: Adapter;

	/**
	 * Database lifecycle hooks
	 */
	hooks: DatabaseHook[];

	/**
	 * Function to generate unique IDs for entities
	 *
	 * @param options - Options for ID generation including entity type and length
	 * @returns A unique ID string
	 */
	generateId: (options: { model: EntityName; size?: number }) => string;
}

/**
 * Base DoubleTie context interface
 *
 * Defines the core properties available in all DoubleTie application contexts.
 * This forms the foundation for the complete context used throughout the system.
 */
export interface BaseDoubleTieContext {
	/**
	 * Application name displayed in application dialogs
	 */
	appName: string;

	/**
	 * Configuration options for the DoubleTie system
	 */
	options: DoubleTieOptions;

	/**
	 * List of origins that are trusted for CORS and CSRF protection
	 */
	trustedOrigins: string[];

	/**
	 * Base URL for API requests
	 */
	baseURL: string;

	/**
	 * Secret key used for signing cookies and tokens
	 */
	secret: string;

	/**
	 * Logger instance for recording events and errors
	 */
	logger: ReturnType<typeof createLogger>;

	/**
	 * Function to generate unique IDs for entities
	 *
	 * @param options - Options for ID generation including entity type and length
	 * @returns A unique ID string
	 */
	generateId: (options: { model: EntityName; size?: number }) => string;

	/**
	 * Database adapter instance
	 */
	adapter: Adapter;

	/**
	 * Entity registry for database operations
	 */
	registry: ReturnType<typeof createRegistry>;

	/**
	 * Database tables for the system
	 */
	tables: ReturnType<typeof getConsentTables>;

	/**
	 * IP address of the client
	 */
	ipAddress?: string | null;

	/**
	 * User agent of the client
	 */
	userAgent?: string | null;
}

/**
 * Complete DoubleTie context type
 *
 * This type combines the base context with plugin-specific context extensions.
 * It's the primary context type used throughout the system.
 *
 * @typeParam TPluginContext - Record of plugin-specific context properties
 */
export type DoubleTieContext<
	TPluginContext extends Record<string, unknown> = Record<string, unknown>,
> = BaseDoubleTieContext & TPluginContext;

/**
 * Context with a specific plugin
 *
 * This utility type makes it easier to create contexts with
 * a specific plugin's context properties.
 *
 * @typeParam TPluginName - The name of the plugin
 * @typeParam TPluginContext - The plugin-specific context properties
 *
 * @example
 * ```ts
 * type AnalyticsContextType = { trackEvent: (name: string) => void };
 * type ContextWithAnalytics = ContextWithPlugin<'analytics', AnalyticsContextType>;
 *
 * // Now you can access context.analytics.trackEvent
 * ```
 */
export type ContextWithPlugin<
	TPluginName extends string,
	TPluginContext extends Record<string, unknown>,
> = DoubleTieContext<Record<TPluginName, TPluginContext>>;

/**
 * Context for hooks
 *
 * Used for database hooks
 */
export type HookContext = {
	options: DoubleTieOptions;
	hooks: DatabaseHook[];
	logger: ReturnType<typeof createLogger>;
	generateId: (options: { model: EntityName; size?: number }) => string;
};
