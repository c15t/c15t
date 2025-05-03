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
	onRequest?: (request: Request, ctx: DoubleTieContext) => Promise<unknown>;

	/**
	 * Handler for intercepting and potentially modifying outgoing responses
	 */
	onResponse?: (response: Response, ctx: DoubleTieContext) => Promise<unknown>;

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
	onResponse?: (response: Response, ctx: C15TContext) => Promise<unknown>;

	/**
	 * Schema the plugin needs for consent data
	 */
	schema?: DoubleTiePluginSchema;
}

/**
 * Infer context extensions from a collection of consent plugins
 */
export type InferPluginContexts<_PluginArray extends C15TPlugin[]> = Record<
	string,
	unknown
>;
