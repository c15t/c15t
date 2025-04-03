import type { H3Event } from 'h3';
import type { Migration } from 'kysely';
import type { DoubleTieContext, DoubleTieOptions } from '~/pkgs/types';
import type { Endpoint, EndpointMiddleware } from '~/pkgs/types/endpoints';
import type { DeepPartial, LiteralString } from '~/pkgs/types/helper';
import type { DoubleTiePluginSchema } from '~/pkgs/types/plugins';
import type { C15TContext } from './context';
import type { C15TOptions } from './options';
/**
 * Base plugin interface for all plugins
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
	 * Schema the plugin needs
	 */
	schema?: DoubleTiePluginSchema;

	/**
	 * The migrations of the plugin. If you define schema that will automatically create
	 * migrations for you.
	 */
	migrations?: Record<string, Migration>;

	/**
	 * The options of the plugin
	 */
	options?: Record<string, unknown>;

	/**
	 * Types to be inferred by the type system
	 */
	$Infer?: Record<string, unknown>;

	/**
	 * The error codes returned by the plugin
	 */
	$ERROR_CODES?: Record<string, string>;

	/**
	 * Type information for context extensions provided by this plugin
	 */
	$InferContext?: Record<string, unknown>;
}

/**
 * Context object provided to consent plugin hooks
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
 * Plugin hook definition for consent management
 */
export interface PluginHook {
	/**
	 * A function to determine if this hook should run for the current consent request
	 */
	matcher: (context: PluginHookContext) => boolean;

	/**
	 * The hook handler that runs if matcher returns true
	 */
	handler: (context: PluginHookContext) => Promise<void> | void;
}

/**
 * Core c15t consent plugin interface
 */
export interface C15TPlugin extends Omit<DoubleTiePlugin, 'endpoints'> {
	/**
	 * Unique identifier for the plugin
	 */
	id: LiteralString;

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
	 */
	init?: (ctx: C15TContext) =>
		| {
				context?: DeepPartial<Omit<C15TContext, 'options'>>;
				options?: Partial<C15TOptions>;
		  }
		| undefined;

	/**
	 * Custom consent API endpoints provided by this plugin
	 */
	endpoints?: {
		[key: string]: Endpoint;
	};

	/**
	 * Handler for intercepting and potentially modifying outgoing responses
	 */
	onResponse?: (event: H3Event, ctx: C15TContext) => Promise<unknown>;

	/**
	 * Schema the plugin needs for consent data
	 */
	schema?: DoubleTiePluginSchema;
}

/**
 * C15T consent plugin schema definition
 */
export type C15TPluginSchema = DoubleTiePluginSchema;

/**
 * Analytics plugin for consent management
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
 */
export function isAnalyticsPlugin(
	plugin: C15TPlugin
): plugin is AnalyticsPlugin {
	return plugin.type === 'analytics';
}

/**
 * Type guard for geo plugins
 */
export function isGeoPlugin(plugin: C15TPlugin): plugin is GeoPlugin {
	return plugin.type === 'geo';
}

/**
 * Infer context extensions from a collection of consent plugins
 */
export type InferPluginContexts<_PluginArray extends C15TPlugin[]> = Record<
	string,
	unknown
>;
