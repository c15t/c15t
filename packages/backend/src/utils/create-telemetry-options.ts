import {
	context,
	type Meter,
	metrics,
	type Span,
	SpanStatusCode,
	trace,
} from '@opentelemetry/api';
import type { C15TOptions } from '../types';
import { version } from '../version';
import { extractErrorMessage } from './extract-error-message';

type TelemetryConfig = C15TOptions['telemetry'];

// ── Cached config (set once during init) ──────────────────────────────
let cachedConfig: TelemetryConfig | null = null;
let cachedDefaultAttributes: Record<string, string | number | boolean> = {};

/**
 * Creates telemetry configuration from provided options
 *
 * This function merges user-provided telemetry options with sensible defaults,
 * ensuring that service name and version are always properly set.
 *
 * Telemetry is opt-in by default - users must explicitly set enabled: true.
 *
 * @param appName - The application name to use for service.name attribute
 * @param telemetryConfig - Optional user-provided telemetry configuration
 * @param tenantId - Optional tenant ID for multi-tenant deployments
 * @returns Properly structured telemetry options for the OpenTelemetry SDK
 */
export function createTelemetryOptions(
	appName = 'c15t',
	telemetryConfig?: TelemetryConfig,
	tenantId?: string
): TelemetryConfig {
	const defaultAttributes: Record<string, string | number | boolean> = {
		...(telemetryConfig?.defaultAttributes || {}),

		// Always ensure these core attributes are set
		'service.name': String(appName),
		'service.version': version,
	};

	if (tenantId) {
		defaultAttributes['tenant.id'] = tenantId;
	}

	const config: TelemetryConfig = {
		// Opt-in: disabled by default, must be explicitly enabled
		enabled: telemetryConfig?.enabled ?? false,
		tracer: telemetryConfig?.tracer,
		meter: telemetryConfig?.meter,
		defaultAttributes,
	};

	// Cache for use without explicit options
	cachedConfig = config;
	cachedDefaultAttributes = defaultAttributes;

	return config;
}

/**
 * Checks if telemetry is enabled.
 * When called without options, uses the cached config from init.
 */
export function isTelemetryEnabled(options?: C15TOptions): boolean {
	if (options) {
		return options.telemetry?.enabled === true;
	}
	return cachedConfig?.enabled === true;
}

/**
 * Gets the tracer for the c15t backend.
 * When called without options, uses the cached config from init.
 */
export const getTracer = (options?: C15TOptions) => {
	if (!isTelemetryEnabled(options)) {
		// Return a no-op tracer when telemetry is disabled
		return trace.getTracer('c15t-noop');
	}
	const tracer = options?.telemetry?.tracer ?? cachedConfig?.tracer;
	if (tracer) {
		return tracer;
	}
	return trace.getTracer(options?.appName ?? 'c15t');
};

/**
 * Gets the meter for the c15t backend.
 * When called without options, uses the cached config from init.
 */
export const getMeter = (options?: C15TOptions): Meter => {
	if (!isTelemetryEnabled(options)) {
		// Return a no-op meter when telemetry is disabled
		return metrics.getMeter('c15t-noop');
	}
	const meter = options?.telemetry?.meter ?? cachedConfig?.meter;
	if (meter) {
		return meter;
	}
	return metrics.getMeter(options?.appName ?? 'c15t');
};

/**
 * Gets the cached default attributes.
 * Used by span wrappers when no explicit options are provided.
 */
export function getDefaultAttributes(): Record<
	string,
	string | number | boolean
> {
	return cachedDefaultAttributes;
}

/**
 * Resets the cached telemetry config (for testing).
 */
export function resetTelemetryConfig(): void {
	cachedConfig = null;
	cachedDefaultAttributes = {};
}

/**
 * Creates a span for an API request
 */
export const createRequestSpan = (
	method: string,
	path: string,
	options?: C15TOptions
) => {
	if (!isTelemetryEnabled(options)) {
		return null;
	}

	const tracer = getTracer(options);
	const defaultAttrs =
		options?.telemetry?.defaultAttributes || getDefaultAttributes();

	const span = tracer.startSpan(`${method} ${path}`, {
		attributes: {
			'http.method': method,
			...defaultAttrs,
		},
	});

	return span;
};

/**
 * Wraps an API request handler in a span.
 * The span is set as active context so child spans nest correctly.
 */
export const withRequestSpan = async <T>(
	method: string,
	path: string,
	operation: () => Promise<T>,
	options?: C15TOptions
): Promise<T> => {
	const span = createRequestSpan(method, path, options);

	if (!span) {
		return operation();
	}

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
};

/**
 * Handles errors in spans
 */
export const handleSpanError = (span: Span, error: unknown) => {
	span.setStatus({
		code: SpanStatusCode.ERROR,
		message: extractErrorMessage(error),
	});

	if (error instanceof Error) {
		span.setAttribute('error.type', error.name);
	}
};

/**
 * Gets the current trace context for log correlation.
 * Returns trace and span IDs from the active span.
 *
 * @returns Object with traceId and spanId, or null if no active span
 */
export function getTraceContext(): {
	traceId: string;
	spanId: string;
} | null {
	const activeSpan = trace.getActiveSpan();
	if (!activeSpan) {
		return null;
	}

	const spanContext = activeSpan.spanContext();
	if (!spanContext) {
		return null;
	}

	return {
		traceId: spanContext.traceId,
		spanId: spanContext.spanId,
	};
}

/**
 * Runs a function within a span context, making the span active.
 * This allows nested operations to access the parent span via trace.getActiveSpan().
 */
export const withSpanContext = async <T>(
	span: Span,
	operation: () => Promise<T>
): Promise<T> => {
	return context.with(trace.setSpan(context.active(), span), operation);
};
