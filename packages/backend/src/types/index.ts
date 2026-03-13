import type { createLogger, LoggerOptions } from '@c15t/logger';
import {
	type Branding,
	brandingValues,
	type GlobalVendorList,
	type NonIABVendor,
	type PolicyConfig,
	/** @deprecated Use `PolicyConfig[]` instead */
	type PolicyPack,
} from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';
import type { Meter, Tracer } from '@opentelemetry/api';
import type { FumaDB, InferFumaDB } from 'fumadb';
import type { CacheAdapter } from '../cache/types';
import type { createRegistry } from '../db/registry';
import type { DB, LatestDB } from '../db/schema';
import type { JurisdictionCode } from './api';

export * from './api';

// Re-export from @c15t/schema for backward compatibility
export const branding = brandingValues;
export type { Branding };

export interface DatabaseOptions {
	/**
	 * The database adapter to use.
	 *
	 * @see {@link https://v2.c15t.com/docs/self-host/guides/database-setup}
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
	 * @see {@link https://v2.c15t.com/docs/self-host/guides/database-setup}
	 */
	tablePrefix?: string;
}

/**
 * OpenAPI spec generation and documentation UI options.
 */
export interface OpenAPIOptions {
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
}

/**
 * OpenTelemetry configuration for tracing and metrics.
 * Telemetry is opt-in and disabled by default.
 * Users must provide their own SDK setup (Node, Bun, edge, etc.).
 */
export interface TelemetryOptions {
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
}

/**
 * IP address tracking and masking options.
 */
export interface IPAddressOptions {
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
}

/**
 * Cache configuration for external persistent storage.
 * Used for caching GVL and other data.
 */
export interface CacheOptions {
	/**
	 * External cache adapter (Redis, KV, etc.).
	 * If not provided, only in-memory cache is used.
	 */
	adapter?: CacheAdapter;
}

/**
 * IAB TCF configuration including GVL, CMP registration, and custom vendors.
 * Disabled by default - most users don't need IAB TCF.
 * Set enabled: true to activate IAB support.
 */
export interface IABOptions {
	/**
	 * Enable IAB TCF support.
	 * When false or not provided, /init does not include IAB payload fields.
	 * When true, /init includes IAB payload only when IAB is active for the
	 * resolved request policy (or when no policies are configured).
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
}

type FumaDBSchema = InferFumaDB<typeof DB>['schemas'];

export type I18nMessageProfiles = Record<
	string,
	Record<string, Partial<Translations>>
>;

export interface I18nOptions {
	/**
	 * Named translation catalogs grouped by profile.
	 *
	 * @example
	 * ```ts
	 * i18n: {
	 *   messages: {
	 *     default: { en: { cookieBanner: { title: '...' } } },
	 *     us_ca: { en: { cookieBanner: { title: '...' } } },
	 *   }
	 * }
	 * ```
	 */
	messages?: I18nMessageProfiles;

	/**
	 * Fallback profile used when a policy does not provide `messageProfile`.
	 * @default "default"
	 */
	defaultProfile?: string;

	/**
	 * Fallback language used when the requested language is not configured in the
	 * active profile.
	 *
	 * @remarks
	 * This does not expand the active profile's allowed languages. If the
	 * configured fallback is not present in the active profile, c15t falls back
	 * to English when available, otherwise to the first configured language in
	 * that profile.
	 *
	 * @default "en"
	 */
	fallbackLanguage?: string;
}

// Re-export canonical policy types from @c15t/schema
export type {
	PolicyConfig,
	PolicyModel,
	PolicyPack,
	PolicyScopeMode,
	PolicyUiAction,
	PolicyUiActionLayout,
	PolicyUiMode,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
} from '@c15t/schema/types';

export interface PolicySnapshotOptions {
	/**
	 * Secret used for signing and verifying policy snapshot tokens.
	 */
	signingKey: string;
	/**
	 * JWT issuer claim for snapshot tokens.
	 * @default "c15t"
	 */
	issuer?: string;
	/**
	 * JWT audience claim for snapshot tokens.
	 * When omitted, c15t derives a default snapshot audience and scopes it per tenant.
	 */
	audience?: string;
	/**
	 * Snapshot token lifetime in seconds.
	 * @default 1800 (30 minutes)
	 */
	ttlSeconds?: number;
}

export interface BackgroundOptions {
	/**
	 * Executes non-critical tasks after the response path has completed.
	 */
	run: (task: () => Promise<void>) => void;
}

export interface C15TOptions {
	/**
	 * The database adapter to use.
	 *
	 * @see {@link https://v2.c15t.com/docs/self-host/guides/database-setup}
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
	 * @see {@link https://v2.c15t.com/docs/self-host/guides/database-setup}
	 */
	tablePrefix?: string;

	/**
	 * Application name used as backend metadata and identity.
	 * Returned by `/init` (`appName`), used in logs, telemetry defaults (`service.name`),
	 * and cache key prefixing.
	 *
	 * @default "c15t"
	 * @see {@link https://v2.c15t.com/docs/self-host/api/configuration}
	 */
	appName?: string;

	/**
	 * Base path prefix for all API routes (e.g. `/api/self-host`).
	 *
	 * @see {@link https://v2.c15t.com/docs/self-host/api/endpoints}
	 */
	basePath?: string;

	/**
	 * Allowed origins for CORS. Required for browser-based consent collection.
	 * Protocol is optional; matching is protocol-agnostic and normalized.
	 *
	 * @example ['example.com', 'app.example.com', 'localhost:3000']
	 * @see {@link https://v2.c15t.com/docs/self-host/api/configuration}
	 */
	trustedOrigins: string[];

	/** Logger configuration. */
	logger?: LoggerOptions;

	/**
	 * Disables the use of Geo Location to determine the jurisdiction.
	 *
	 * When enabled, the jurisdiction will be set to "GDPR" to show the strictest
	 * version of the banner as we don't know the jurisdiction in this case.
	 *
	 * @default false
	 */
	disableGeoLocation?: boolean;

	/**
	 * Override base translations.
	 *
	 * @deprecated Use `i18n.messages` instead. This alias is kept for compatibility.
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
	 * Internationalization message profiles used by runtime policies.
	 */
	i18n?: I18nOptions;

	/**
	 * Runtime regional policy pack resolved per request.
	 *
	 * @remarks
	 * Omit this field to keep legacy non-policy behavior. Pass `[]` to force
	 * explicit no-banner mode. In production, prefer including a default policy
	 * so unmatched traffic still resolves deterministically.
	 *
	 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
	 */
	policyPacks?: PolicyConfig[];

	/**
	 * Select which branding to show in the consent banner.
	 * Use "none" to hide branding.
	 * @default "c15t"
	 */
	branding?: Branding;

	/**
	 * OpenAPI spec generation and documentation UI options.
	 *
	 * @see {@link https://v2.c15t.com/docs/self-host/api/endpoints}
	 */
	openapi?: OpenAPIOptions;

	/**
	 * OpenTelemetry configuration for tracing and metrics.
	 * Telemetry is opt-in and disabled by default.
	 * Users must provide their own SDK setup (Node, Bun, edge, etc.).
	 *
	 * @see {@link https://v2.c15t.com/docs/self-host/guides/observability}
	 */
	telemetry?: TelemetryOptions;

	/**
	 * IP address tracking and masking options.
	 *
	 * @see {@link https://v2.c15t.com/docs/self-host/api/configuration}
	 */
	ipAddress?: IPAddressOptions;

	/**
	 * Cache configuration for external persistent storage.
	 * Used for caching GVL and other data.
	 *
	 * @see {@link https://v2.c15t.com/docs/self-host/guides/caching}
	 */
	cache?: CacheOptions;

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
	 *
	 * @see {@link https://v2.c15t.com/docs/self-host/guides/iab-tcf}
	 */
	iab?: IABOptions;

	/**
	 * Optional signed policy snapshots used to keep /init and /subjects consistent.
	 */
	policySnapshot?: PolicySnapshotOptions;

	/**
	 * Optional background task runner for non-critical side effects.
	 */
	background?: BackgroundOptions;
}

export interface C15TContext
	extends Omit<
		C15TOptions,
		'ipAddress' | 'adapter' | 'logger' | 'tablePrefix'
	> {
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
