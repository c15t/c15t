import type { UnionToIntersection } from '@better-fetch/fetch';
import type { H3Event } from 'h3';
import type { Migration } from 'kysely';
import type { Field } from '~/pkgs/data-model';
import type { DoubleTieContext, HookEndpointContext } from './context';
import type { Endpoint, EndpointMiddleware } from './endpoints';
import type { DeepPartial, LiteralString } from './helper';
import type { DoubleTieMiddleware, DoubleTieOptions } from './options';

/**
 * Context object provided to plugin hooks
 *
 * This extends the standard endpoint context with additional properties
 * specific to plugin hooks, such as the request path and geolocation data.
 */
export interface PluginHookContext {
	/**
	 * The path of the current request
	 */
	path: string;

	/**
	 * Geolocation information (added by the geo plugin)
	 */
	geo?: {
		/**
		 * IP address of the request
		 */
		ip: string;

		/**
		 * Country code (ISO 3166-1 alpha-2)
		 */
		country?: string;

		/**
		 * Region or state code
		 */
		region?: string;

		/**
		 * Source of the geolocation data
		 */
		source: string;
	};
}

/**
 * Plugin hook definition
 *
 * Defines a hook that can be registered by a plugin to intercept
 * and modify request processing at specific points in the lifecycle.
 */
export interface PluginHook {
	/**
	 * A function to determine if this hook should run for the current request
	 *
	 * @param context - The hook context with request details
	 * @returns True if the hook should run, false otherwise
	 */
	matcher: (context: PluginHookContext) => boolean;

	/**
	 * The hook handler that runs if matcher returns true
	 *
	 * @param context - The hook context with request details
	 * @returns A Promise that resolves when the hook completes, or void
	 */
	handler: (context: PluginHookContext) => Promise<void> | void;
}

/**
 * Core DoubleTie plugin interface
 *
 * Defines the structure that all DoubleTie plugins must conform to,
 * including lifecycle methods, hooks, endpoints, and type information.
 */
export interface DoubleTiePlugin {
	/**
	 * Unique identifier for the plugin
	 * Must be a string literal for type safety
	 */
	id: LiteralString;

	/**
	 * Name of the plugin
	 */
	name: string;

	/**
	 * Type of plugin for classification and type guards
	 */
	type: string;

	/**
	 * The init function is called when the plugin is initialized.
	 * You can return a new context or modify the existing context.
	 *
	 * @param ctx - The DoubleTie context
	 * @returns An object with context or options modifications, or undefined
	 */
	init?: (ctx: DoubleTieContext) =>
		| {
				context?: DeepPartial<Omit<DoubleTieContext, 'options'>>;
				options?: Partial<DoubleTieOptions>;
		  }
		| undefined;

	/**
	 * Custom API endpoints provided by this plugin
	 * Each key is the endpoint name, and the value is the endpoint handler
	 */
	endpoints?: {
		[key: string]: Endpoint;
	};

	/**
	 * Middleware functions to process requests for specific paths
	 */
	middlewares?: {
		path: string;
		middleware: EndpointMiddleware;
	}[];

	/**
	 * Handler for intercepting and potentially modifying incoming requests
	 */
	onRequest?: (event: H3Event, ctx: DoubleTieContext) => Promise<unknown>;

	/**
	 * Handler for intercepting and potentially modifying outgoing responses
	 */
	onResponse?: (event: H3Event, ctx: DoubleTieContext) => Promise<unknown>;

	/**
	 * Request lifecycle hooks for executing code before or after endpoint handling
	 */
	hooks?: {
		/**
		 * Hooks that run before the endpoint handler
		 * Each hook has a matcher to determine when it should run
		 */
		before?: {
			matcher: (context: HookEndpointContext) => boolean;
			handler: DoubleTieMiddleware;
		}[];

		/**
		 * Hooks that run after the endpoint handler has completed
		 * Each hook has a matcher to determine when it should run
		 */
		after?: {
			matcher: (context: HookEndpointContext) => boolean;
			handler: DoubleTieMiddleware;
		}[];
	};

	/**
	 * Schema the plugin needs
	 *
	 * This will also be used to migrate the database. If the fields are dynamic from the plugins
	 * configuration each time the configuration is changed a new migration will be created.
	 *
	 * NOTE: If you want to create migrations manually using
	 * migrations option or any other way you
	 * can disable migration per table basis.
	 *
	 * @example
	 * ```ts
	 * schema: {
	 * 	subject: {
	 * 		fields: {
	 * 			email: {
	 * 				 type: "string",
	 * 			},
	 * 			emailVerified: {
	 * 				type: "boolean",
	 * 				defaultValue: false,
	 * 			},
	 * 		},
	 * 	}
	 * } as AuthPluginSchema
	 * ```
	 */
	schema?: DoubleTiePluginSchema;

	/**
	 * The migrations of the plugin. If you define schema that will automatically create
	 * migrations for you.
	 *
	 * ⚠️ Only uses this if you dont't want to use the schema option and you disabled migrations for
	 * the tables.
	 */
	migrations?: Record<string, Migration>;

	/**
	 * The options of the plugin
	 */
	options?: Record<string, unknown>;

	/**
	 * Types to be inferred by the type system
	 * Used for type information in the plugin system
	 */
	$Infer?: Record<string, unknown>;

	/**
	 * The error codes returned by the plugin
	 * Used for consistent error handling across the system
	 */
	$ERROR_CODES?: Record<string, string>;

	/**
	 * Type information for context extensions provided by this plugin
	 * This will be used to properly type the context in hooks and methods
	 */
	$InferContext?: Record<string, unknown>;
}

/**
 * Extracts type definitions from all plugins in a configuration
 *
 * This utility type extracts the combined type information from all plugins
 * in a DoubleTie configuration, making it available to the type system.
 *
 * @typeParam TOptions - The DoubleTie configuration options type
 */
export type ExtractPluginTypeDefinitions<TOptions extends DoubleTieOptions> =
	TOptions['plugins'] extends Array<infer Plugin>
		? Plugin extends DoubleTiePlugin
			? Plugin extends { $Infer: infer PluginTypes }
				? PluginTypes extends Record<string, unknown>
					? PluginTypes
					: Record<string, never>
				: Record<string, never>
			: Record<string, never>
		: Record<string, never>;

/**
 * Extracts plugins of a specific type from a configuration
 *
 * This utility type filters plugins from a configuration to only include
 * those matching a specific type.
 *
 * @typeParam O - The DoubleTie configuration options type
 * @typeParam T - The plugin type to extract
 *
 * @example
 * ```ts
 * // Get all analytics plugins from the configuration
 * type AnalyticsPlugins = ExtractPluginType<MyConfig, 'analytics'>;
 * ```
 */
export type ExtractPluginType<
	O extends DoubleTieOptions,
	T extends string,
> = O['plugins'] extends Array<infer P>
	? P extends DoubleTiePlugin
		? P extends { type: T }
			? P
			: never
		: never
	: never;

/**
 * Plugin factory function type
 *
 * This utility type defines the signature for factory functions that create
 * plugin instances with type safety.
 *
 * @typeParam T - The plugin type to create
 *
 * @example
 * ```ts
 * const createAnalyticsPlugin: PluginFactory<AnalyticsPlugin> =
 *   (options) => ({
 *     id: 'analytics',
 *     type: 'analytics',
 *     name: 'Analytics Plugin',
 *     ...options
 *   });
 * ```
 */
export type PluginFactory<T extends DoubleTiePlugin> = (
	options?: Omit<T, 'id' | 'type'> & { id?: string }
) => T;

/**
 * Extracts error codes from all plugins in a configuration
 *
 * This utility type combines the error codes from all plugins in a configuration
 * to create a complete set of possible error codes.
 *
 * @typeParam O - The DoubleTie configuration options type
 */
export type InferPluginErrorCodes<O extends DoubleTieOptions> =
	O['plugins'] extends Array<infer P>
		? P extends DoubleTiePlugin
			? P['$ERROR_CODES'] extends infer EC
				? EC extends Record<string, unknown>
					? EC
					: Record<string, never>
				: Record<string, never>
			: Record<string, never>
		: Record<string, never>;

/**
 * Plugin schema definition
 *
 * Defines the database schema extensions that a plugin may require.
 */
export interface DoubleTiePluginSchema {
	[tableName: string]: {
		/**
		 * Should migrations be created for this table when using auto migrations
		 *
		 * If you want to create migrations manually using the migrations
		 * option or any other way you can disable migration per table.
		 *
		 * @default true
		 */
		createMigrations?: boolean;

		/**
		 * Fields to add to the table
		 */
		fields: Record<string, Field>;
	};
}

/**
 * Analytics plugin interface
 *
 * Defines the specialized interface for plugins that provide analytics functionality.
 */
export interface AnalyticsPlugin extends DoubleTiePlugin {
	type: 'analytics';
	analyticsOptions?: {
		/**
		 * List of events to track
		 */
		trackingEvents: string[];

		/**
		 * Whether to anonymize subject data
		 */
		anonymizeData?: boolean;
	};
}

/**
 * Geolocation plugin interface
 *
 * Defines the specialized interface for plugins that provide geolocation functionality.
 */
export interface GeoPlugin extends DoubleTiePlugin {
	type: 'geo';
	geoOptions?: {
		/**
		 * Default jurisdiction to use when geolocation fails
		 */
		defaultJurisdiction?: string;

		/**
		 * Service URL for IP address lookups
		 */
		ipLookupService?: string;
	};
}

/**
 * Type guard for analytics plugins
 *
 * @param plugin - The plugin to check
 * @returns True if the plugin is an analytics plugin
 */
export function isAnalyticsPlugin(
	plugin: DoubleTiePlugin
): plugin is AnalyticsPlugin {
	return plugin.type === 'analytics';
}

/**
 * Type guard for geolocation plugins
 *
 * @param plugin - The plugin to check
 * @returns True if the plugin is a geolocation plugin
 */
export function isGeoPlugin(plugin: DoubleTiePlugin): plugin is GeoPlugin {
	return plugin.type === 'geo';
}

/**
 * Infers the combined context extensions from an array of plugins
 *
 * This utility type extracts and combines all context extensions provided
 * by an array of plugins.
 *
 * @typeParam PluginArray - Array of plugin types
 */
export type InferPluginContexts<PluginArray extends DoubleTiePlugin[]> =
	UnionToIntersection<
		PluginArray extends Array<infer SinglePlugin>
			? SinglePlugin extends DoubleTiePlugin
				? SinglePlugin extends { $InferContext: infer ContextType }
					? ContextType extends Record<string, unknown>
						? ContextType
						: Record<string, never>
					: Record<string, never>
				: Record<string, never>
			: Record<string, never>
	> &
		Record<string, unknown>;
