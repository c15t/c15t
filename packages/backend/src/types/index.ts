import type { createLogger, LoggerOptions } from '@c15t/logger';
import {
	type Branding,
	brandingValues,
	type GlobalVendorList,
	type InitOutput,
	type NonIABVendor,
} from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';
import type { Meter, Tracer } from '@opentelemetry/api';
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

	/**
	 * Tenant ID for multi-tenant deployments.
	 * When set, all database queries are automatically scoped to this tenant.
	 */
	tenantId?: string;

	/**
	 * Optional prefix for all database table names.
	 * Useful when sharing a database with other applications to avoid naming conflicts.
	 *
	 * @example 'c15t_' // tables become: c15t_subject, c15t_consent, etc.
	 */
	tablePrefix?: string;
}

/**
 * Style value used for slot-based customizations.
 */
export type EmbedSlotStyle =
	| string
	| {
			className?: string;
			style?: Record<string, string | number>;
			noStyle?: boolean;
	  };

/**
 * Embed theme options for script-tag integrations.
 *
 * This intentionally supports all token groups used by `@c15t/ui` and slot-level
 * class/style overrides so script-tag output can match React UI behavior.
 */
export interface EmbedThemeOptions {
	colors?: Record<string, string>;
	dark?: Record<string, string>;
	typography?: Record<string, string | number>;
	spacing?: Record<string, string>;
	radius?: Record<string, string>;
	shadows?: Record<string, string>;
	motion?: Record<string, string>;
	slots?: Record<string, EmbedSlotStyle>;
}

/**
 * Embed UI options for script-tag integrations.
 */
export interface EmbedUIOptions {
	/**
	 * Removes built-in styles when true.
	 */
	noStyle?: boolean;

	/**
	 * Disables UI animations when true.
	 */
	disableAnimation?: boolean;

	/**
	 * Locks scroll while dialogs are open when true.
	 * @default false
	 */
	scrollLock?: boolean;

	/**
	 * Traps keyboard focus in dialogs when true.
	 * @default true
	 */
	trapFocus?: boolean;

	/**
	 * Preferred color scheme.
	 * @default 'system'
	 */
	colorScheme?: 'light' | 'dark' | 'system';
}

/**
 * Optional component preload hints for embed runtime.
 */
export interface EmbedComponentHints {
	/**
	 * Components that should be preloaded by the embed runtime.
	 */
	preload?: Array<'banner' | 'dialog' | 'widget' | 'iabBanner' | 'iabDialog'>;
}

/**
 * Store configuration for script-tag embed runtime.
 */
export interface EmbedStoreOptions {
	/**
	 * Global store namespace exposed on window.
	 * @default "c15tStore"
	 */
	namespace?: string;

	/**
	 * Storage key used for consent persistence.
	 * @default "c15t"
	 */
	storageKey?: string;
}

/**
 * Override values for jurisdiction/language resolution.
 */
export interface EmbedOverrides {
	country?: string;
	region?: string;
	language?: string;
	gpc?: boolean;
}

/**
 * Styling options for script-tag embed runtime.
 */
export interface EmbedOptions {
	/**
	 * Runtime UI behavior options.
	 */
	ui?: EmbedUIOptions;

	/**
	 * Theme object consumed by the embed runtime.
	 */
	theme?: EmbedThemeOptions;

	/**
	 * Optional component preload hints.
	 */
	componentHints?: EmbedComponentHints;

	/**
	 * Store runtime configuration.
	 */
	store?: EmbedStoreOptions;

	/**
	 * Optional runtime overrides for country/region/language/GPC.
	 */
	overrides?: EmbedOverrides;
}

/**
 * Bootstrap payload embedded in `/embed.js`.
 */
export interface EmbedBootstrapPayload {
	init: InitOutput;
	options: EmbedOptions;
	revision?: string;
}

export interface AdvancedOptions {
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
	 * Script-tag embed configuration.
	 *
	 * When enabled, the backend serves `/embed.js` with an embedded bootstrap
	 * payload that includes init data and these styling options.
	 *
	 * @default disabled
	 */
	embed?: {
		/**
		 * Enable script-tag embed endpoint.
		 * @default false
		 */
		enabled?: boolean;

		/**
		 * Styling options returned inside `/embed.js` payload.
		 */
		options?: EmbedOptions;

		/**
		 * Optional config revision identifier.
		 * Useful for cache invalidation and diagnostics.
		 */
		revision?: string;
	};

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
		 */
		options?: {
			info?: {
				title?: string;
				version?: string;
				description?: string;
			};
			servers?: Array<{ url: string; description?: string }>;
			security?: Array<Record<string, string[]>>;
		};

		/**
		 * Custom template for rendering the API documentation UI
		 * If provided, this will be used instead of the default Scalar UI
		 */
		customUiTemplate?: string;
	};
	/**
	 * OpenTelemetry configuration for tracing and metrics.
	 * Telemetry is opt-in and disabled by default.
	 * Users must provide their own SDK setup (Node, Bun, edge, etc.).
	 */
	telemetry?: {
		/**
		 * Enable telemetry (tracing and metrics).
		 * Must be explicitly set to true to activate.
		 * @default false
		 */
		enabled?: boolean;
		/**
		 * User-provided tracer instance.
		 * Users should set up their own OpenTelemetry SDK and pass the tracer here.
		 * @example trace.getTracer('my-app')
		 */
		tracer?: Tracer;
		/**
		 * User-provided meter instance for metrics.
		 * Users should set up their own OpenTelemetry SDK and pass the meter here.
		 * @example metrics.getMeter('my-app')
		 */
		meter?: Meter;
		/**
		 * Default attributes to include on all spans and metrics.
		 */
		defaultAttributes?: Record<string, string | number | boolean>;
	};
	ipAddress?: {
		/**
		 * Enable/disable IP address tracking.
		 * When disabled, all IP addresses will be stored as null.
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
	 * IAB TCF configuration including GVL, CMP registration, and custom vendors.
	 * Disabled by default - most users don't need IAB TCF.
	 * Set enabled: true to activate IAB support.
	 */
	iab?: {
		/**
		 * Enable IAB TCF support.
		 * When false or not provided, /init returns gvl: null.
		 */
		enabled: true;

		/**
		 * CMP ID registered with IAB Europe.
		 * This is returned to clients via the /init endpoint so they
		 * can use the correct CMP identity in TC Strings.
		 *
		 * @see https://iabeurope.eu/cmp-list/ - List of registered CMPs
		 */
		cmpId?: number;

		/**
		 * Bundled GVL translations by language code.
		 * These are checked first before any cache or fetch.
		 *
		 * @example
		 * ```ts
		 * import enGVL from './gvl/en.json';
		 * import deGVL from './gvl/de.json';
		 *
		 * iab: {
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
}

export interface BaseOptions {
	/** Display name for your application, used in consent records. */
	appName?: string;
	/** Base path prefix for all API routes (e.g. `/api/consent`). */
	basePath?: string;
	/** Allowed origins for CORS. Required for browser-based consent collection. */
	trustedOrigins: string[];
	/** Advanced configuration options. */
	advanced?: AdvancedOptions;
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
	ipAddress?: string | null;
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
