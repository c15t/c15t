import type { createLogger, LoggerOptions } from '@c15t/logger';
import { type Branding, brandingValues } from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';
import type { Tracer } from '@opentelemetry/api';
import type { OpenAPIGeneratorOptions } from '@orpc/openapi';
import type { FumaDB, InferFumaDB } from 'fumadb';
import type { createRegistry } from '../db/registry';
import type { DB } from '../db/schema';

export * from './api';

// Re-export from @c15t/schema for backward compatibility
export const branding = brandingValues;
export type { Branding };

export interface DatabaseOptions {
	/**
	 * The database adapter to use.
	 */
	adapter: FumaDB<FumaDBSchema>['adapter'];
}

interface BaseOptions {
	appName?: string;
	basePath?: string;
	trustedOrigins: string[];
	advanced?: {
		/**
		 * Disables the use of Geo Location to determine the jurisdiction
		 *
		 * When enabled, the jurisdiction will be set to "GDPR" to show the strictest version of the banner as we don't know the jurisdiction in this case
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

		/**
		 * Select which branding to show in the consent banner.
		 * Use "none" to hide branding.
		 * @default "c15t"
		 */
		branding?: Branding;

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
