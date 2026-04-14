import type { Counter, Histogram, Meter } from '@opentelemetry/api';
import type { C15TOptions } from '../types';
import { getMeter, isTelemetryEnabled } from './create-telemetry-options';

/**
 * Geographic attributes for consent metrics
 */
export interface GeoAttributes {
	/** Legal framework (GDPR, CCPA, LGPD, etc.) */
	jurisdiction?: string;
	/** ISO country code (US, DE, FR, etc.) */
	country?: string;
	/** State/province code (CA, BY, etc.) */
	region?: string;
	/** Index signature for additional attributes */
	[key: string]: string | number | boolean | undefined;
}

/**
 * Consent metric attributes
 */
export interface ConsentMetricAttributes extends GeoAttributes {
	/** Consent type (cookie_banner, privacy_policy, etc.) */
	type: string;
	/** Consent status (accepted, rejected, partial) */
	status?: string;
}

/**
 * HTTP metric attributes
 */
export interface HttpMetricAttributes {
	/** HTTP method */
	method: string;
	/** Route pattern (e.g., /subjects/:id) */
	route: string;
	/** HTTP status code */
	status: number;
	/** Error type if applicable */
	errorType?: string;
	/** Index signature for additional attributes */
	[key: string]: string | number | boolean | undefined;
}

/**
 * Database metric attributes
 */
export interface DbMetricAttributes {
	/** Operation type (find, create, update, delete) */
	operation: string;
	/** Entity type (consent, subject, audit_log, etc.) */
	entity: string;
	/** Error type if applicable */
	errorType?: string;
	/** Index signature for additional attributes */
	[key: string]: string | number | boolean | undefined;
}

/**
 * Cache metric attributes
 */
export interface CacheMetricAttributes {
	/** Cache layer (bundled, memory, external) */
	layer: 'bundled' | 'memory' | 'external';
	/** Operation type (get, set, delete) */
	operation?: string;
	/** Index signature for additional attributes */
	[key: string]: string | number | boolean | undefined;
}

/**
 * GVL fetch metric attributes
 */
export interface GvlMetricAttributes {
	/** Language code */
	language: string;
	/** Source of the data (cache, fetch) */
	source?: 'cache' | 'fetch';
	/** HTTP status code if fetched */
	status?: number;
	/** Error type if applicable */
	errorType?: string;
	/** Index signature for additional attributes */
	[key: string]: string | number | boolean | undefined;
}

/**
 * C15T Metrics container
 * Holds all metric instruments for the c15t backend
 */
export interface C15TMetrics {
	// Business metrics
	readonly consentCreated: Counter;
	readonly consentAccepted: Counter;
	readonly consentRejected: Counter;
	readonly subjectCreated: Counter;
	readonly subjectLinked: Counter;
	readonly consentCheckCount: Counter;
	readonly initCount: Counter;

	// HTTP metrics
	readonly httpRequestDuration: Histogram;
	readonly httpRequestCount: Counter;
	readonly httpErrorCount: Counter;

	// Database metrics
	readonly dbQueryDuration: Histogram;
	readonly dbQueryCount: Counter;
	readonly dbErrorCount: Counter;

	// Cache metrics
	readonly cacheHit: Counter;
	readonly cacheMiss: Counter;
	readonly cacheLatency: Histogram;

	// GVL metrics
	readonly gvlFetchDuration: Histogram;
	readonly gvlFetchCount: Counter;
	readonly gvlFetchError: Counter;

	// Helper methods
	recordConsentCreated(attributes: ConsentMetricAttributes): void;
	recordConsentAccepted(
		attributes: Omit<ConsentMetricAttributes, 'status'>
	): void;
	recordConsentRejected(
		attributes: Omit<ConsentMetricAttributes, 'status'>
	): void;
	recordSubjectCreated(attributes: GeoAttributes & { domain?: string }): void;
	recordSubjectLinked(identityProvider?: string): void;
	recordConsentCheck(type: string, found: boolean): void;
	recordInit(attributes: GeoAttributes): void;
	recordHttpRequest(attributes: HttpMetricAttributes, durationMs: number): void;
	recordDbQuery(attributes: DbMetricAttributes, durationMs: number): void;
	recordDbError(attributes: DbMetricAttributes): void;
	recordCacheHit(layer: CacheMetricAttributes['layer']): void;
	recordCacheMiss(layer: CacheMetricAttributes['layer']): void;
	recordCacheLatency(
		attributes: CacheMetricAttributes,
		durationMs: number
	): void;
	recordGvlFetch(attributes: GvlMetricAttributes, durationMs: number): void;
	recordGvlError(attributes: GvlMetricAttributes): void;
}

/**
 * Sanitize attributes - remove undefined values and convert to strings
 */
function sanitizeAttributes<
	T extends Record<string, string | number | boolean | undefined>,
>(attrs: T): Record<string, string | number | boolean> {
	return Object.fromEntries(
		Object.entries(attrs).filter(([_, v]) => v !== undefined && v !== null) as [
			string,
			string | number | boolean,
		][]
	);
}

/**
 * Create a C15TMetrics instance from an OpenTelemetry Meter.
 *
 * @param meter - OpenTelemetry Meter to create instruments from
 * @returns C15TMetrics object with all instruments and helper methods
 */
function createMetrics(meter: Meter): C15TMetrics {
	// Business metrics - High value for c15t
	const consentCreated = meter.createCounter('c15t.consent.created', {
		description: 'Number of consent submissions',
		unit: '1',
	});

	const consentAccepted = meter.createCounter('c15t.consent.accepted', {
		description: 'Number of consents accepted',
		unit: '1',
	});

	const consentRejected = meter.createCounter('c15t.consent.rejected', {
		description: 'Number of consents rejected',
		unit: '1',
	});

	const subjectCreated = meter.createCounter('c15t.subject.created', {
		description: 'Number of new subjects created',
		unit: '1',
	});

	const subjectLinked = meter.createCounter('c15t.subject.linked', {
		description: 'Number of subjects linked to external ID',
		unit: '1',
	});

	const consentCheckCount = meter.createCounter('c15t.consent_check.count', {
		description: 'Number of cross-device consent checks',
		unit: '1',
	});

	const initCount = meter.createCounter('c15t.init.count', {
		description: 'Number of init endpoint calls',
		unit: '1',
	});

	// HTTP metrics
	const httpRequestDuration = meter.createHistogram(
		'c15t.http.request.duration',
		{
			description: 'HTTP request latency',
			unit: 'ms',
		}
	);

	const httpRequestCount = meter.createCounter('c15t.http.request.count', {
		description: 'Number of HTTP requests',
		unit: '1',
	});

	const httpErrorCount = meter.createCounter('c15t.http.error.count', {
		description: 'Number of HTTP errors',
		unit: '1',
	});

	// Database metrics
	const dbQueryDuration = meter.createHistogram('c15t.db.query.duration', {
		description: 'Database query latency',
		unit: 'ms',
	});

	const dbQueryCount = meter.createCounter('c15t.db.query.count', {
		description: 'Number of database queries',
		unit: '1',
	});

	const dbErrorCount = meter.createCounter('c15t.db.error.count', {
		description: 'Number of database errors',
		unit: '1',
	});

	// Cache metrics
	const cacheHit = meter.createCounter('c15t.cache.hit', {
		description: 'Number of cache hits',
		unit: '1',
	});

	const cacheMiss = meter.createCounter('c15t.cache.miss', {
		description: 'Number of cache misses',
		unit: '1',
	});

	const cacheLatency = meter.createHistogram('c15t.cache.latency', {
		description: 'Cache operation latency',
		unit: 'ms',
	});

	// GVL metrics
	const gvlFetchDuration = meter.createHistogram('c15t.gvl.fetch.duration', {
		description: 'GVL fetch latency',
		unit: 'ms',
	});

	const gvlFetchCount = meter.createCounter('c15t.gvl.fetch.count', {
		description: 'Number of GVL fetches',
		unit: '1',
	});

	const gvlFetchError = meter.createCounter('c15t.gvl.fetch.error', {
		description: 'Number of GVL fetch errors',
		unit: '1',
	});

	return {
		// Instruments
		consentCreated,
		consentAccepted,
		consentRejected,
		subjectCreated,
		subjectLinked,
		consentCheckCount,
		initCount,
		httpRequestDuration,
		httpRequestCount,
		httpErrorCount,
		dbQueryDuration,
		dbQueryCount,
		dbErrorCount,
		cacheHit,
		cacheMiss,
		cacheLatency,
		gvlFetchDuration,
		gvlFetchCount,
		gvlFetchError,

		// Helper methods
		recordConsentCreated(attributes: ConsentMetricAttributes): void {
			consentCreated.add(1, sanitizeAttributes(attributes));
		},

		recordConsentAccepted(
			attributes: Omit<ConsentMetricAttributes, 'status'>
		): void {
			consentAccepted.add(1, sanitizeAttributes(attributes));
		},

		recordConsentRejected(
			attributes: Omit<ConsentMetricAttributes, 'status'>
		): void {
			consentRejected.add(1, sanitizeAttributes(attributes));
		},

		recordSubjectCreated(
			attributes: GeoAttributes & { domain?: string }
		): void {
			subjectCreated.add(1, sanitizeAttributes(attributes));
		},

		recordSubjectLinked(identityProvider?: string): void {
			subjectLinked.add(1, {
				identityProvider: identityProvider || 'unknown',
			});
		},

		recordConsentCheck(type: string, found: boolean): void {
			consentCheckCount.add(1, { type, found: String(found) });
		},

		recordInit(attributes: GeoAttributes): void {
			initCount.add(1, sanitizeAttributes(attributes));
		},

		recordHttpRequest(
			attributes: HttpMetricAttributes,
			durationMs: number
		): void {
			const attrs = sanitizeAttributes(attributes);
			httpRequestCount.add(1, attrs);
			httpRequestDuration.record(durationMs, attrs);

			if (attributes.status >= 400) {
				httpErrorCount.add(1, attrs);
			}
		},

		recordDbQuery(attributes: DbMetricAttributes, durationMs: number): void {
			const attrs = sanitizeAttributes(attributes);
			dbQueryCount.add(1, attrs);
			dbQueryDuration.record(durationMs, attrs);
		},

		recordDbError(attributes: DbMetricAttributes): void {
			dbErrorCount.add(1, sanitizeAttributes(attributes));
		},

		recordCacheHit(layer: CacheMetricAttributes['layer']): void {
			cacheHit.add(1, { layer });
		},

		recordCacheMiss(layer: CacheMetricAttributes['layer']): void {
			cacheMiss.add(1, { layer });
		},

		recordCacheLatency(
			attributes: CacheMetricAttributes,
			durationMs: number
		): void {
			cacheLatency.record(durationMs, sanitizeAttributes(attributes));
		},

		recordGvlFetch(attributes: GvlMetricAttributes, durationMs: number): void {
			const attrs = sanitizeAttributes(attributes);
			gvlFetchCount.add(1, attrs);
			gvlFetchDuration.record(durationMs, attrs);
		},

		recordGvlError(attributes: GvlMetricAttributes): void {
			gvlFetchError.add(1, sanitizeAttributes(attributes));
		},
	};
}

// Lazy-initialized metric instances
let metricsInstance: C15TMetrics | null = null;

/**
 * Get or create the metrics instance for the c15t backend.
 * Returns null if telemetry is not enabled.
 *
 * @param options - C15T options for telemetry configuration
 * @returns C15TMetrics instance or null if telemetry is disabled
 */
export function getMetrics(options?: C15TOptions): C15TMetrics | null {
	if (metricsInstance) return metricsInstance;
	if (!isTelemetryEnabled(options)) return null;

	metricsInstance = createMetrics(getMeter(options));
	return metricsInstance;
}

/**
 * Reset the metrics instance (useful for testing)
 */
export function resetMetrics(): void {
	metricsInstance = null;
}
