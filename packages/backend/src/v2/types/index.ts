import type { Translations } from '@c15t/translations';
import type { createLogger } from '@doubletie/logger';
import type { LoggerOptions } from '@doubletie/logger';
import type { Tracer } from '@opentelemetry/api';
import type { OpenAPIGeneratorOptions } from '@orpc/openapi';
import type { FumaDB, InferFumaDB } from 'fumadb';
import type { createRegistry } from '../db/registry';
import type { DB } from '../db/schema';

export * from './api';

export interface DatabaseOptions {
	/**
	 * The database adapter to use.
	 */
	adapter: FumaDB<FumaDBSchema>['adapter'];
}

interface BaseOptions {
	appName?: string;
	baseURL: string;
	basePath?: string;
	trustedOrigins: string[];
	advanced?: {
		/**
		 * Disable geo location - Banner will allways be shown
		 *
		 * @default false
		 */
		disableGeoLocation?: boolean;
		/**
		 * Override base translations
		 *
		 * @example
		 * ```ts
		 * {
		 *   en: enTranslations,
		 *   de: deTranslations,
		 * }
		 * ```
		 */
		customTranslations?: Record<string, Partial<Translations>>;
		openapi?: {
			/**
			 * Enable/disable OpenAPI spec generation
			 * @default true
			 */
			enabled?: boolean;

			/**
			 * Path to serve the OpenAPI JSON spec
			 * @default "/spec.json"
			 */
			specPath?: string;

			/**
			 * Path to serve the API documentation UI
			 * @default "/docs"
			 */
			docsPath?: string;

			/**
			 * OpenAPI specification options
			 * These are passed to the OpenAPIGenerator.generate() method
			 */
			options?: Partial<OpenAPIGeneratorOptions>;

			/**
			 * Custom template for rendering the API documentation UI
			 * If provided, this will be used instead of the default Scalar UI
			 */
			customUiTemplate?: string;
		};
		telemetry?: {
			disabled?: boolean;
			tracer?: Tracer;
			defaultAttributes?: Record<string, string | number | boolean>;
		};
		ipAddress?: {
			disableIpTracking?: boolean;
			// Override default ip address headers
			ipAddressHeaders?: string[];
		};
	};
}

type FumaDBSchema = InferFumaDB<typeof DB>['schemas'];
export interface C15TOptions extends BaseOptions, DatabaseOptions {
	logger?: LoggerOptions;
}

export interface C15TContext extends BaseOptions {
	appName: string;
	logger: ReturnType<typeof createLogger>;
	registry: ReturnType<typeof createRegistry>;
	db: ReturnType<InferFumaDB<typeof DB>['orm']>;

	// Resolved from request
	ipAddress?: string;
	userAgent?: string;
	origin?: string;
	trustedOrigin?: boolean;
	path?: string;
	method?: string;
	headers?: Headers;
}

export type DeepPartial<T> = T extends (...args: unknown[]) => unknown
	? T
	: T extends object
		? { [K in keyof T]?: DeepPartial<T[K]> }
		: T;
