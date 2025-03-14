import type {
	EndpointContext,
	EndpointOptions,
	InputContext,
} from 'better-call';
import type { createRegistry } from '~/db/create-registry';
import type { getConsentTables } from '~/db/schema/definition';
import type { DatabaseHook } from '~/pkgs/data-model/hooks/types';
import type { EntityName } from '~/pkgs/data-model/schema/types';
import { Adapter } from '~/pkgs/db-adapters/types';
import type { createLogger } from '~/utils';
import type { C15TOptions } from './index';

/**
 * Extended endpoint context for hooks
 *
 * This type extends the standard endpoint context with additional properties
 * specific to c15t hooks, allowing hooks to access the complete c15t context.
 *
 * @typeParam TOptions - Endpoint configuration options type
 *
 * @see GenericEndpointContext for a simpler context type without input context inclusion
 */
export type HookEndpointContext<
	TOptions extends EndpointOptions = EndpointOptions,
> = EndpointContext<string, TOptions> &
	Omit<InputContext<string, TOptions>, 'method'> & {
		/**
		 * The c15t context with possible hook-specific extensions
		 */
		context: C15TContext & {
			/**
			 * Value returned by the endpoint handler, available in 'after' hooks
			 */
			returned?: unknown;

			/**
			 * Response headers, available in 'after' hooks
			 */
			responseHeaders?: Headers;
		};

		/**
		 * Request headers
		 */
		headers?: Headers;
	};

/**
 * Standard endpoint context for c15t handlers
 *
 * A simplified context type that includes the c15t context,
 * used by endpoint handlers throughout the system.
 *
 * @typeParam TOptions - Endpoint configuration options type
 */
export type GenericEndpointContext<
	TOptions extends EndpointOptions = EndpointOptions,
> = EndpointContext<string, TOptions> & {
	/**
	 * The c15t application context
	 */
	context: C15TContext;
};

/**
 * Base shared context for all c15t components
 *
 * Contains the minimal set of properties needed by all components
 * in the c15t system, including configuration options and logging.
 */
export interface BaseContext {
	/**
	 * Configuration options for the c15t system
	 */
	options: C15TOptions;

	/**
	 * Logger instance for recording events and errors
	 */
	logger: ReturnType<typeof createLogger>;
}

/**
 * Registry-specific context for database adapters
 *
 * Extends the base context with properties needed for
 * database operations and entity management.
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
 * Base context without plugin-specific extensions
 *
 * This interface defines the core context properties available to all
 * components in the c15t system before plugin extensions are applied.
 */
export interface BaseC15TContext {
	/**
	 * Application name displayed in consent dialogs
	 */
	appName: string;

	/**
	 * Configuration options for the c15t system
	 */
	options: C15TOptions;

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
	 * Database tables for the consent system
	 */
	tables: ReturnType<typeof getConsentTables>;

	/**
	 * IP address of the client
	 */
	ipAddress?: string | null;

	/**
	 * Subject agent of the client
	 */
	userAgent?: string | null;
}

/**
 * Extended context type with plugin extensions
 *
 * This type extends the base context with plugin-specific properties,
 * allowing plugins to add their own functionality to the context.
 *
 * @typeParam TPluginContext - Record of plugin-specific context extensions
 *
 * @example
 * ```ts
 * // Plugin extending the context with analytics capabilities
 * interface AnalyticsContext {
 *   analytics: {
 *     trackEvent: (event: string, data: unknown) => void;
 *     getSessionId: () => string;
 *   }
 * }
 *
 * // Using the extended context in a component
 * function handleConsent(ctx: C15TContext<AnalyticsContext>) {
 *   // Base context is available
 *   const { baseURL, logger } = ctx;
 *
 *   // Plugin context is also available
 *   ctx.analytics.trackEvent('consent_given', { timestamp: Date.now() });
 * }
 * ```
 */
export type C15TContext<
	TPluginContext extends Record<string, unknown> = Record<string, unknown>,
> = BaseC15TContext & TPluginContext;

/**
 * Helper to extract context with a specific plugin's context type
 *
 * This utility type makes it easier to work with context that has been
 * extended by a specific plugin, providing proper type information.
 *
 * @typeParam TPluginName - The name of the plugin providing the context extension
 * @typeParam TPluginContext - The type of the context extension provided by the plugin
 *
 * @example
 * ```ts
 * // Working with a specific plugin's context
 * function useGeoPlugin(ctx: ContextWithPlugin<'geo', GeoPluginContext>) {
 *   // TypeScript knows that ctx.geo exists and has the right type
 *   const country = ctx.geo.getCurrentCountry();
 *   return country;
 * }
 * ```
 */
export type ContextWithPlugin<
	TPluginName extends string,
	TPluginContext extends Record<string, unknown>,
> = C15TContext<Record<TPluginName, TPluginContext>>;
