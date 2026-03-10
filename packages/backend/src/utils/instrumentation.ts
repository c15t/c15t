import type { Span } from '@opentelemetry/api';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import type { C15TOptions } from '../types';
import {
	getDefaultAttributes,
	getTracer,
	handleSpanError,
	isTelemetryEnabled,
	withSpanContext,
} from './create-telemetry-options';

/**
 * Span attributes for database operations
 */
export interface DatabaseSpanAttributes {
	/** The database operation type (find, create, update, delete) */
	operation: 'find' | 'create' | 'update' | 'delete' | 'findOrCreate';
	/** The entity type being operated on */
	entity: string;
	/** Optional additional attributes */
	[key: string]: string | number | boolean | undefined;
}

/**
 * Span attributes for external API calls
 */
export interface ExternalSpanAttributes {
	/** The URL being called */
	url: string;
	/** The HTTP method */
	method: string;
	/** Optional additional attributes */
	[key: string]: string | number | boolean | undefined;
}

/**
 * Execute an async operation within a span, handling status and error recording.
 *
 * Sets SpanStatusCode.OK on success, records error attributes and sets
 * SpanStatusCode.ERROR on failure, and always ends the span.
 */
async function executeWithSpan<T>(
	span: Span,
	operation: () => Promise<T>
): Promise<T> {
	try {
		const result = await withSpanContext(span, operation);
		span.setStatus({ code: SpanStatusCode.OK });
		return result;
	} catch (error) {
		handleSpanError(span, error);
		throw error;
	} finally {
		span.end();
	}
}

/**
 * Resolves default attributes from explicit options or the cached config.
 */
function resolveDefaultAttributes(
	options?: C15TOptions
): Record<string, string | number | boolean> {
	return options?.telemetry?.defaultAttributes || getDefaultAttributes();
}

/**
 * Wraps a database operation in a span for tracing.
 *
 * @param attributes - Span attributes describing the operation
 * @param operation - The async operation to wrap
 * @param options - C15T options for telemetry configuration
 * @returns The result of the operation
 *
 * @example
 * ```typescript
 * const subject = await withDatabaseSpan(
 *   { operation: 'find', entity: 'subject' },
 *   async () => db.subject.findUnique({ where: { id } }),
 *   options
 * );
 * ```
 */
export async function withDatabaseSpan<T>(
	attributes: DatabaseSpanAttributes,
	operation: () => Promise<T>,
	options?: C15TOptions
): Promise<T> {
	if (!isTelemetryEnabled(options)) {
		return operation();
	}

	const tracer = getTracer(options);
	const spanName = `db.${attributes.entity}.${attributes.operation}`;

	const span = tracer.startSpan(spanName, {
		kind: SpanKind.CLIENT,
		attributes: {
			'db.system': 'c15t',
			'db.operation': attributes.operation,
			'db.entity': attributes.entity,
			...resolveDefaultAttributes(options),
			...Object.fromEntries(
				Object.entries(attributes).filter(
					([key]) => !['operation', 'entity'].includes(key)
				)
			),
		},
	});

	return executeWithSpan(span, operation);
}

/**
 * Wraps an external API call in a span for tracing.
 *
 * @param attributes - Span attributes describing the external call
 * @param operation - The async operation to wrap
 * @param options - C15T options for telemetry configuration
 * @returns The result of the operation
 *
 * @example
 * ```typescript
 * const response = await withExternalSpan(
 *   { url: 'https://api.example.com/data', method: 'GET' },
 *   async () => fetch('https://api.example.com/data'),
 *   options
 * );
 * ```
 */
export async function withExternalSpan<T>(
	attributes: ExternalSpanAttributes,
	operation: () => Promise<T>,
	options?: C15TOptions
): Promise<T> {
	if (!isTelemetryEnabled(options)) {
		return operation();
	}

	const tracer = getTracer(options);
	const url = new URL(attributes.url);
	const spanName = `HTTP ${attributes.method} ${url.hostname}`;

	const span = tracer.startSpan(spanName, {
		kind: SpanKind.CLIENT,
		attributes: {
			'http.method': attributes.method,
			'http.url': `${url.origin}${url.pathname}`,
			'http.host': url.hostname,
			...resolveDefaultAttributes(options),
			...Object.fromEntries(
				Object.entries(attributes).filter(
					([key]) => !['url', 'method'].includes(key)
				)
			),
		},
	});

	return executeWithSpan(span, operation);
}

/**
 * Wraps a cache operation in a span for tracing.
 *
 * @param operation - The cache operation type
 * @param layer - The cache layer (bundled, memory, external)
 * @param fn - The async operation to wrap
 * @param options - C15T options for telemetry configuration
 * @returns The result of the operation
 */
export async function withCacheSpan<T>(
	operation: 'get' | 'set' | 'delete',
	layer: 'bundled' | 'memory' | 'external',
	fn: () => Promise<T>,
	options?: C15TOptions
): Promise<T> {
	if (!isTelemetryEnabled(options)) {
		return fn();
	}

	const tracer = getTracer(options);
	const spanName = `cache.${layer}.${operation}`;

	const span = tracer.startSpan(spanName, {
		kind: SpanKind.CLIENT,
		attributes: {
			'cache.operation': operation,
			'cache.layer': layer,
			...resolveDefaultAttributes(options),
		},
	});

	return executeWithSpan(span, fn);
}
