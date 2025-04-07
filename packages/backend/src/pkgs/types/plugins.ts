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
