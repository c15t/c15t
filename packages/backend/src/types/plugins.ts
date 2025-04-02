import type { Field } from '~/pkgs/data-model';
import type { DeepPartial } from '~/pkgs/types/helper';
import type { C15TContext } from './context';
import type { C15TOptions } from './options';

/**
 * Middleware function for processing API requests
 */
export type DoubleTieMiddleware = (
	req: Request,
	context: Record<string, unknown>,
	next: () => Promise<Response>
) => Promise<Response>;

/**
 * API endpoint handler function type
 *
 * This matches the Endpoint type from the better-call package
 */
export type Endpoint = (inputCtx: Record<string, unknown>) => Promise<unknown>;

/**
 * Base plugin interface for all plugins
 */
export interface DoubleTiePlugin {
	/**
	 * Unique identifier for the plugin
	 */
	id: string;

	/**
	 * Name of the plugin
	 */
	name: string;

	/**
	 * Type of plugin
	 */
	type: string;

	/**
	 * Schema the plugin needs
	 */
	schema?: DoubleTiePluginSchema;
}

/**
 * Plugin schema definition
 */
export interface DoubleTiePluginSchema {
	[tableName: string]: {
		/**
		 * Should migrations be created for this table
		 */
		createMigrations?: boolean;

		/**
		 * Fields to add to the table
		 */
		fields: Record<string, Field>;
	};
}

/**
 * Context object provided to consent plugin hooks
 *
 * This extends the standard endpoint context with additional properties
 * specific to consent plugin hooks, such as the request path and geolocation data.
 */
export interface PluginHookContext {
	/**
	 * The path of the current request
	 */
	path: string;

	/**
	 * Geolocation information (added by the geo plugin)
	 * Used for consent jurisdiction determination
	 */
	geo?: {
		/**
		 * IP address of the request
		 */
		ip: string;

		/**
		 * Country code (ISO 3166-1 alpha-2)
		 * Used for regional consent rules
		 */
		country?: string;

		/**
		 * Region or state code
		 * Used for regional consent rules
		 */
		region?: string;

		/**
		 * Source of the geolocation data
		 */
		source: string;
	};
}

/**
 * Plugin hook definition for consent management
 *
 * Defines a hook that can be registered by a plugin to intercept
 * and modify consent request processing at specific points in the lifecycle.
 */
export interface PluginHook {
	/**
	 * A function to determine if this hook should run for the current consent request
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
 * Core c15t consent plugin interface
 *
 * Extends the base DoubleTie plugin interface with consent management specific
 * functionality for controlling consent flows, storage, and integration.
 */
export interface C15TPlugin extends Omit<DoubleTiePlugin, 'endpoints'> {
	/**
	 * Unique identifier for the plugin
	 * Must be a string literal for type safety
	 */
	id: string;

	/**
	 * Name of the plugin
	 */
	name: string;

	/**
	 * Type of consent plugin for classification and type guards
	 */
	type: string;

	/**
	 * The init function is called when the consent plugin is initialized.
	 * You can return a new context or modify the existing context.
	 *
	 * @param ctx - The c15t consent context
	 * @returns An object with context or options modifications, or undefined
	 */
	init?: (ctx: C15TContext) =>
		| {
				context?: DeepPartial<Omit<C15TContext, 'options'>>;
				options?: Partial<C15TOptions>;
		  }
		| undefined;

	/**
	 * Custom consent API endpoints provided by this plugin
	 * Each key is the endpoint name, and the value is the endpoint handler
	 */
	endpoints?: {
		[key: string]: Endpoint;
	};

	/**
	 * Handler for intercepting and potentially modifying outgoing responses
	 *
	 * @param response - The outgoing HTTP response
	 * @param ctx - The context
	 * @returns A modified response or undefined to continue with the original
	 */
	onResponse?: (
		response: Response,
		ctx: C15TContext
	) => Promise<
		| {
				response: Response;
				context?: Record<string, unknown>;
		  }
		| undefined
	>;

	/**
	 * Schema the plugin needs for consent data
	 *
	 * This will also be used to migrate the database. If the fields are dynamic from the plugins
	 * configuration each time the configuration is changed a new migration will be created.
	 */
	schema?: DoubleTiePluginSchema;
}

/**
 * C15T consent plugin schema definition
 *
 * Extends the base DoubleTie plugin schema with consent management specific schema
 * requirements.
 */
export type C15TPluginSchema = DoubleTiePluginSchema;

/**
 * Analytics plugin for consent management
 *
 * This plugin type provides analytics capabilities for tracking consent events,
 * user behavior, and compliance metrics.
 */
export interface AnalyticsPlugin extends C15TPlugin {
	type: 'analytics';
	analyticsOptions?: {
		/**
		 * List of consent events to track
		 */
		trackingEvents: string[];

		/**
		 * Whether to anonymize subject data for privacy compliance
		 */
		anonymizeData?: boolean;
	};
}

/**
 * Geo-targeting plugin for consent management
 *
 * This plugin type provides geolocation capabilities for determining
 * jurisdiction-specific consent requirements.
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
 * Type guard for analytics plugins
 *
 * @param plugin - The plugin to check
 * @returns True if the plugin is an analytics plugin
 */
export function isAnalyticsPlugin(
	plugin: C15TPlugin
): plugin is AnalyticsPlugin {
	return plugin.type === 'analytics';
}

/**
 * Type guard for geo plugins
 *
 * @param plugin - The plugin to check
 * @returns True if the plugin is a geo plugin
 */
export function isGeoPlugin(plugin: C15TPlugin): plugin is GeoPlugin {
	return plugin.type === 'geo';
}

/**
 * Infer context extensions from a collection of consent plugins
 *
 * This utility type extracts all context extensions from an array of
 * consent plugins to create a unified context type.
 */
export type InferPluginContexts<_PluginArray extends C15TPlugin[]> = Record<
	string,
	unknown
>;
