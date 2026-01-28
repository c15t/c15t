import type { createLogger, LoggerOptions } from '@c15t/logger';
import {
	type Branding,
	brandingValues,
	type GlobalVendorList,
	type NonIABVendor,
} from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';
import type { Tracer } from '@opentelemetry/api';
import type { OpenAPIGeneratorOptions } from '@orpc/openapi';
import type { FumaDB, InferFumaDB } from 'fumadb';
import type { CacheAdapter } from '../cache/types';
import type { createRegistry } from '../db/registry';
import type { DB, LatestDB } from '../db/schema';

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
			/**
			 * Enable/disable IP address tracking.
			 * When disabled, all IP addresses will be stored as 'unknown'.
			 * @default true
			 */
			tracking?: boolean;

			/**
			 * Enable/disable IP address masking to reduce PII collection.
			 * - IPv4: Last octet is replaced with 0 (e.g., 192.168.1.100 -> 192.168.1.0)
			 * - IPv6: Last 80 bits are masked (e.g., 2001:db8:85a3::1 -> 2001:db8:85a3::)
			 * @default true
			 */
			masking?: boolean;

			/**
			 * Override the default IP address headers used to extract client IP.
			 * Headers are checked in order, first match wins.
			 */
			ipAddressHeaders?: string[];
		};

		/**
		 * Cache configuration for external persistent storage.
		 * Used for caching GVL and other data.
		 */
		cache?: {
			/**
			 * External cache adapter (Redis, KV, etc.).
			 * If not provided, only in-memory cache is used.
			 */
			adapter?: CacheAdapter;
		};

		/**
		 * API keys for authenticated endpoints.
		 * Used for server-side endpoints like GET /subjects.
		 *
		 * @example
		 * ```ts
		 * apiKeys: ['sk_live_abc123', 'sk_live_def456']
		 * ```
		 */
		apiKeys?: string[];

		/**
		 * GVL (Global Vendor List) configuration for IAB TCF compliance.
		 * Disabled by default - most users don't need IAB TCF.
		 * Set enabled: true to activate GVL support.
		 */
		gvl?: {
			/**
			 * Enable GVL support.
			 * When false or not provided, /init returns gvl: null.
			 */
			enabled: true;

			/**
			 * Bundled GVL translations by language code.
			 * These are checked first before any cache or fetch.
			 *
			 * @example
			 * ```ts
			 * import enGVL from './gvl/en.json';
			 * import deGVL from './gvl/de.json';
			 *
			 * gvl: {
			 *   enabled: true,
			 *   bundled: { en: enGVL, de: deGVL }
			 * }
			 * ```
			 */
			bundled?: Record<string, GlobalVendorList>;

			/**
			 * Vendor IDs to filter when fetching non-bundled languages.
			 * Reduces payload size.
			 */
			vendorIds?: number[];

			/**
			 * Override the default GVL endpoint.
			 * @default 'https://gvl.consent.io'
			 */
			endpoint?: string;

			/**
			 * Custom vendors not registered with IAB.
			 * These are synced to the frontend via the /init endpoint.
			 *
			 * @example
			 * ```ts
			 * customVendors: [
			 *   {
			 *     id: 'internal-analytics',
			 *     name: 'Our Analytics',
			 *     privacyPolicyUrl: 'https://example.com/privacy',
			 *     purposes: [1, 8],
			 *   }
			 * ]
			 * ```
			 */
			customVendors?: NonIABVendor[];
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
	db: ReturnType<InferFumaDB<typeof LatestDB>['orm']>;

	// Resolved from request
	ipAddress?: string;
	userAgent?: string;
	origin?: string;
	trustedOrigin?: boolean;
	path?: string;
	method?: string;
	headers?: Headers;

	// Authentication state
	/**
	 * Whether the request was authenticated with a valid API key.
	 * Set to true when a valid Bearer token is provided in the Authorization header.
	 */
	apiKeyAuthenticated?: boolean;
}

export type DeepPartial<T> = T extends (...args: unknown[]) => unknown
	? T
	: T extends object
		? { [K in keyof T]?: DeepPartial<T[K]> }
		: T;
