import type { UnionToIntersection } from '@better-fetch/fetch';
/**
 * Plugin System for c15t Consent Management
 *
 * This module defines the plugin system architecture for the c15t consent management system.
 * Plugins provide a way to extend functionality with additional features like analytics,
 * geolocation, custom consent flows, and more.
 */
import type { Endpoint } from 'better-call';
import type { Migration } from 'kysely';
import type { C15TMiddleware } from '~/api/call';
import type { Field } from '~/pkgs/data-model/fields';
import type {
	C15TContext,
	C15TOptions,
	DeepPartial,
	HookEndpointContext,
	LiteralString,
} from './index';

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
 * Hooks are used to run custom logic at specific points in the request lifecycle.
 * Each hook includes a matcher function to determine when it should run and
 * a handler function that contains the actual logic.
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
 * c15t Plugin Definition
 *
 * This interface defines the structure of a plugin for the c15t consent management system.
 * Plugins can add endpoints, hooks, error codes, and custom functionality.
 *
 * @example
 * ```typescript
 * const myPlugin: C15TPlugin = {
 *   id: 'my-plugin',
 *   init: (context) => {
 *     // Initialize plugin
 *   },
 *   endpoints: {
 *     myEndpoint: createEndpoint('/my-endpoint', async (ctx) => {
 *       return ctx.json({ success: true });
 *     })
 *   }
 * };
 * ```
 */
export interface C15TPlugin {
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
	 * @param ctx - The c15t context
	 * @returns An object with context or options modifications, or undefined
	 */
	init?: (ctx: C15TContext) =>
		| {
				context?: DeepPartial<Omit<C15TContext, 'options'>>;
				options?: Partial<C15TOptions>;
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
	 * Each middleware includes a path pattern and the middleware function
	 */
	middlewares?: {
		path: string;
		middleware: Endpoint;
	}[];

	/**
	 * Handler for intercepting and potentially modifying incoming requests
	 *
	 * @param request - The incoming HTTP request
	 * @param ctx - The c15t context
	 * @returns A modified request, a response to short-circuit handling, or undefined to continue
	 */
	onRequest?: (
		request: Request,
		ctx: C15TContext
	) => Promise<
		| {
				response: Response;
		  }
		| {
				request: Request;
		  }
		| undefined
	>;

	/**
	 * Handler for intercepting and potentially modifying outgoing responses
	 *
	 * @param response - The outgoing HTTP response
	 * @param ctx - The c15t context
	 * @returns A modified response or undefined to continue with the original
	 */
	onResponse?: (
		response: Response,
		ctx: C15TContext
	) => Promise<
		| {
				response: Response;
		  }
		| undefined
	>;

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
			handler: C15TMiddleware;
		}[];

		/**
		 * Hooks that run after the endpoint handler has completed
		 * Each hook has a matcher to determine when it should run
		 */
		after?: {
			matcher: (context: HookEndpointContext) => boolean;
			handler: C15TMiddleware;
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
	schema?: C15TPluginSchema;

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
 * Improved type inference for plugin types
 *
 * This type utility extracts all plugin type definitions from configuration options,
 * allowing for comprehensive type checking of plugin features.
 *
 * @typeParam TOptions - The c15t configuration options type
 *
 * @example
 * ```ts
 * // Get all plugin types from configuration
 * type AllPluginTypes = ExtractPluginTypeDefinitions<MyAppOptions>;
 *
 * // Types will include all properties from all plugins' $Infer fields
 * ```
 */
export type ExtractPluginTypeDefinitions<TOptions extends C15TOptions> =
	TOptions['plugins'] extends Array<infer Plugin>
		? Plugin extends C15TPlugin
			? Plugin extends { $Infer: infer PluginTypes }
				? PluginTypes extends Record<string, unknown>
					? PluginTypes
					: Record<string, never>
				: Record<string, never>
			: Record<string, never>
		: Record<string, never>;

/**
 * Helper to extract specific plugin type from options
 *
 * This type utility finds plugins of a specific type from a configuration
 * object, enabling type-safe access to plugin instances.
 *
 * @typeParam O - The c15t configuration options type
 * @typeParam T - The plugin type string to extract
 *
 * @example
 * ```ts
 * // Extract all analytics plugins from configuration
 * type MyAnalyticsPlugins = ExtractPluginType<MyAppOptions, 'analytics'>;
 * ```
 */
export type ExtractPluginType<
	O extends C15TOptions,
	T extends string,
> = O['plugins'] extends Array<infer P>
	? P extends C15TPlugin
		? P extends { type: T }
			? P
			: never
		: never
	: never;

/**
 * Type-safe plugin factory function
 *
 * A type definition for functions that create plugin instances with proper typing.
 *
 * @typeParam T - The specific plugin type being created
 *
 * @example
 * ```ts
 * // Create a type-safe plugin factory
 * const createAnalyticsPlugin: PluginFactory<AnalyticsPlugin> =
 *   (options) => ({
 *     id: options?.id || 'analytics',
 *     type: 'analytics',
 *     // Other plugin properties
 *     analyticsOptions: options?.analyticsOptions
 *   });
 * ```
 */
export type PluginFactory<T extends C15TPlugin> = (
	options?: Omit<T, 'id' | 'type'> & { id?: string }
) => T;

/**
 * Infer plugin error codes from configuration options
 *
 * This type utility extracts the error codes defined by plugins from a configuration object,
 * allowing TypeScript to understand the possible error codes.
 *
 * @typeParam O - The c15t configuration options type
 *
 * @example
 * ```ts
 * // Get all error codes from plugins
 * type AllErrorCodes = InferPluginErrorCodes<MyAppOptions>;
 * ```
 */
export type InferPluginErrorCodes<O extends C15TOptions> =
	O['plugins'] extends Array<infer P>
		? P extends C15TPlugin
			? P['$ERROR_CODES'] extends infer EC
				? EC extends Record<string, unknown>
					? EC
					: Record<string, never>
				: Record<string, never>
			: Record<string, never>
		: Record<string, never>;

/**
 * Schema type for plugin database extensions
 *
 * This defines the structure for database schema extensions provided by plugins,
 * including table definitions, fields, and migration controls.
 */
export type C15TPluginSchema = {
	[table in string]: {
		/**
		 * Field definitions for this table
		 */
		fields: {
			[field in string]: Field;
		};

		/**
		 * Whether to disable automatic migration generation for this table
		 */
		disableMigration?: boolean;

		/**
		 * Custom entity name for this table
		 */
		entityName?: string;
	};
};

/**
 * Analytics plugin type definition
 *
 * Specialized plugin type for analytics functionality with type-safe options.
 *
 * @example
 * ```ts
 * // Create an analytics plugin
 * const analytics: AnalyticsPlugin = {
 *   id: 'google-analytics',
 *   type: 'analytics',
 *   analyticsOptions: {
 *     trackingEvents: ['consent_given', 'consent_withdrawn'],
 *     anonymizeData: true
 *   }
 * };
 * ```
 */
export interface AnalyticsPlugin extends C15TPlugin {
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
 * Geolocation plugin type definition
 *
 * Specialized plugin type for geolocation functionality with type-safe options.
 *
 * @example
 * ```ts
 * // Create a geolocation plugin
 * const geo: GeoPlugin = {
 *   id: 'maxmind',
 *   type: 'geo',
 *   geoOptions: {
 *     defaultJurisdiction: 'EU',
 *     ipLookupService: 'https://geo.example.com'
 *   }
 * };
 * ```
 */
export interface GeoPlugin extends C15TPlugin {
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
 * Type guard to check if a plugin is an analytics plugin
 *
 * @param plugin - The plugin to check
 * @returns True if the plugin is an analytics plugin
 *
 * @example
 * ```ts
 * if (isAnalyticsPlugin(plugin)) {
 *   // Can safely access analyticsOptions
 *   const events = plugin.analyticsOptions?.trackingEvents;
 * }
 * ```
 */
export function isAnalyticsPlugin(
	plugin: C15TPlugin
): plugin is AnalyticsPlugin {
	return plugin.type === 'analytics';
}

/**
 * Type guard to check if a plugin is a geo plugin
 *
 * @param plugin - The plugin to check
 * @returns True if the plugin is a geo plugin
 *
 * @example
 * ```ts
 * if (isGeoPlugin(plugin)) {
 *   // Can safely access geoOptions
 *   const defaultRegion = plugin.geoOptions?.defaultJurisdiction;
 * }
 * ```
 */
export function isGeoPlugin(plugin: C15TPlugin): plugin is GeoPlugin {
	return plugin.type === 'geo';
}

/**
 * Helper to extract plugin context types from plugin array
 *
 * This utility combines all context extensions from an array of plugins
 * into a single type, allowing for proper typing of the complete context.
 *
 * @typeParam PluginArray - Array of plugin types
 *
 * @example
 * ```ts
 * // Given plugins array with plugins that extend context
 * const plugins = [authPlugin, geoPlugin, analyticsPlugin];
 *
 * // Get combined context type from all plugins
 * type MyAppContext = InferPluginContexts<typeof plugins>;
 *
 * // Context will have auth, geo, and analytics properties with correct types
 * ```
 */
export type InferPluginContexts<PluginArray extends C15TPlugin[]> =
	UnionToIntersection<
		PluginArray extends Array<infer SinglePlugin>
			? SinglePlugin extends C15TPlugin
				? SinglePlugin extends { $InferContext: infer ContextType }
					? ContextType extends Record<string, unknown>
						? ContextType
						: Record<string, never>
					: Record<string, never>
				: Record<string, never>
			: Record<string, never>
	> &
		Record<string, unknown>;
