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

// Lazy-initialized metric instances
let metricsInstance: C15TMetrics | null = null;

/**
 * C15T Metrics container class
 * Holds all metric instruments for the c15t backend
 */
export class C15TMetrics {
	// Business metrics
	public readonly consentCreated: Counter;
	public readonly consentAccepted: Counter;
	public readonly consentRejected: Counter;
	public readonly subjectCreated: Counter;
	public readonly subjectLinked: Counter;
	public readonly consentCheckCount: Counter;
	public readonly initCount: Counter;

	// HTTP metrics
	public readonly httpRequestDuration: Histogram;
	public readonly httpRequestCount: Counter;
	public readonly httpErrorCount: Counter;

	// Database metrics
	public readonly dbQueryDuration: Histogram;
	public readonly dbQueryCount: Counter;
	public readonly dbErrorCount: Counter;

	// Cache metrics
	public readonly cacheHit: Counter;
	public readonly cacheMiss: Counter;
	public readonly cacheLatency: Histogram;

	// GVL metrics
	public readonly gvlFetchDuration: Histogram;
	public readonly gvlFetchCount: Counter;
	public readonly gvlFetchError: Counter;

	constructor(meter: Meter) {
		// Business metrics - High value for c15t
		this.consentCreated = meter.createCounter('c15t.consent.created', {
			description: 'Number of consent submissions',
			unit: '1',
		});

		this.consentAccepted = meter.createCounter('c15t.consent.accepted', {
			description: 'Number of consents accepted',
			unit: '1',
		});

		this.consentRejected = meter.createCounter('c15t.consent.rejected', {
			description: 'Number of consents rejected',
			unit: '1',
		});

		this.subjectCreated = meter.createCounter('c15t.subject.created', {
			description: 'Number of new subjects created',
			unit: '1',
		});

		this.subjectLinked = meter.createCounter('c15t.subject.linked', {
			description: 'Number of subjects linked to external ID',
			unit: '1',
		});

		this.consentCheckCount = meter.createCounter('c15t.consent_check.count', {
			description: 'Number of cross-device consent checks',
			unit: '1',
		});

		this.initCount = meter.createCounter('c15t.init.count', {
			description: 'Number of init endpoint calls',
			unit: '1',
		});

		// HTTP metrics
		this.httpRequestDuration = meter.createHistogram(
			'c15t.http.request.duration',
			{
				description: 'HTTP request latency',
				unit: 'ms',
			}
		);

		this.httpRequestCount = meter.createCounter('c15t.http.request.count', {
			description: 'Number of HTTP requests',
			unit: '1',
		});

		this.httpErrorCount = meter.createCounter('c15t.http.error.count', {
			description: 'Number of HTTP errors',
			unit: '1',
		});

		// Database metrics
		this.dbQueryDuration = meter.createHistogram('c15t.db.query.duration', {
			description: 'Database query latency',
			unit: 'ms',
		});

		this.dbQueryCount = meter.createCounter('c15t.db.query.count', {
			description: 'Number of database queries',
			unit: '1',
		});

		this.dbErrorCount = meter.createCounter('c15t.db.error.count', {
			description: 'Number of database errors',
			unit: '1',
		});

		// Cache metrics
		this.cacheHit = meter.createCounter('c15t.cache.hit', {
			description: 'Number of cache hits',
			unit: '1',
		});

		this.cacheMiss = meter.createCounter('c15t.cache.miss', {
			description: 'Number of cache misses',
			unit: '1',
		});

		this.cacheLatency = meter.createHistogram('c15t.cache.latency', {
			description: 'Cache operation latency',
			unit: 'ms',
		});

		// GVL metrics
		this.gvlFetchDuration = meter.createHistogram('c15t.gvl.fetch.duration', {
			description: 'GVL fetch latency',
			unit: 'ms',
		});

		this.gvlFetchCount = meter.createCounter('c15t.gvl.fetch.count', {
			description: 'Number of GVL fetches',
			unit: '1',
		});

		this.gvlFetchError = meter.createCounter('c15t.gvl.fetch.error', {
			description: 'Number of GVL fetch errors',
			unit: '1',
		});
	}

	// Helper methods for recording metrics with proper attributes

	/**
	 * Record a consent creation event
	 */
	recordConsentCreated(attributes: ConsentMetricAttributes): void {
		this.consentCreated.add(1, this.sanitizeAttributes(attributes));
	}

	/**
	 * Record a consent accepted event
	 */
	recordConsentAccepted(
		attributes: Omit<ConsentMetricAttributes, 'status'>
	): void {
		this.consentAccepted.add(1, this.sanitizeAttributes(attributes));
	}

	/**
	 * Record a consent rejected event
	 */
	recordConsentRejected(
		attributes: Omit<ConsentMetricAttributes, 'status'>
	): void {
		this.consentRejected.add(1, this.sanitizeAttributes(attributes));
	}

	/**
	 * Record a subject creation event
	 */
	recordSubjectCreated(attributes: GeoAttributes & { domain?: string }): void {
		this.subjectCreated.add(1, this.sanitizeAttributes(attributes));
	}

	/**
	 * Record a subject linking event
	 */
	recordSubjectLinked(identityProvider?: string): void {
		this.subjectLinked.add(1, {
			identityProvider: identityProvider || 'unknown',
		});
	}

	/**
	 * Record a consent check event
	 */
	recordConsentCheck(type: string, found: boolean): void {
		this.consentCheckCount.add(1, { type, found: String(found) });
	}

	/**
	 * Record an init endpoint call
	 */
	recordInit(attributes: GeoAttributes): void {
		this.initCount.add(1, this.sanitizeAttributes(attributes));
	}

	/**
	 * Record HTTP request metrics
	 */
	recordHttpRequest(
		attributes: HttpMetricAttributes,
		durationMs: number
	): void {
		const attrs = this.sanitizeAttributes(attributes);
		this.httpRequestCount.add(1, attrs);
		this.httpRequestDuration.record(durationMs, attrs);

		if (attributes.status >= 400) {
			this.httpErrorCount.add(1, attrs);
		}
	}

	/**
	 * Record database query metrics
	 */
	recordDbQuery(attributes: DbMetricAttributes, durationMs: number): void {
		const attrs = this.sanitizeAttributes(attributes);
		this.dbQueryCount.add(1, attrs);
		this.dbQueryDuration.record(durationMs, attrs);
	}

	/**
	 * Record database error
	 */
	recordDbError(attributes: DbMetricAttributes): void {
		this.dbErrorCount.add(1, this.sanitizeAttributes(attributes));
	}

	/**
	 * Record cache hit
	 */
	recordCacheHit(layer: CacheMetricAttributes['layer']): void {
		this.cacheHit.add(1, { layer });
	}

	/**
	 * Record cache miss
	 */
	recordCacheMiss(layer: CacheMetricAttributes['layer']): void {
		this.cacheMiss.add(1, { layer });
	}

	/**
	 * Record cache operation latency
	 */
	recordCacheLatency(
		attributes: CacheMetricAttributes,
		durationMs: number
	): void {
		this.cacheLatency.record(durationMs, this.sanitizeAttributes(attributes));
	}

	/**
	 * Record GVL fetch
	 */
	recordGvlFetch(attributes: GvlMetricAttributes, durationMs: number): void {
		const attrs = this.sanitizeAttributes(attributes);
		this.gvlFetchCount.add(1, attrs);
		this.gvlFetchDuration.record(durationMs, attrs);
	}

	/**
	 * Record GVL fetch error
	 */
	recordGvlError(attributes: GvlMetricAttributes): void {
		this.gvlFetchError.add(1, this.sanitizeAttributes(attributes));
	}

	/**
	 * Sanitize attributes - remove undefined values and convert to strings
	 */
	private sanitizeAttributes<
		T extends Record<string, string | number | boolean | undefined>,
	>(attrs: T): Record<string, string | number | boolean> {
		return Object.fromEntries(
			Object.entries(attrs).filter(
				([_, v]) => v !== undefined && v !== null
			) as [string, string | number | boolean][]
		);
	}
}

/**
 * Get or create the metrics instance for the c15t backend.
 * Returns null if telemetry is not enabled.
 *
 * @param options - C15T options for telemetry configuration
 * @returns C15TMetrics instance or null if telemetry is disabled
 */
export function getMetrics(options?: C15TOptions): C15TMetrics | null {
	if (!isTelemetryEnabled(options)) {
		return null;
	}

	if (!metricsInstance) {
		const meter = getMeter(options);
		metricsInstance = new C15TMetrics(meter);
	}

	return metricsInstance;
}

/**
 * Reset the metrics instance (useful for testing)
 */
export function resetMetrics(): void {
	metricsInstance = null;
}
