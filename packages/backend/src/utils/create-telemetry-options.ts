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

type TelemetryConfig = NonNullable<C15TOptions['advanced']>['telemetry'];

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
 * @returns Properly structured telemetry options for the OpenTelemetry SDK
 */
export function createTelemetryOptions(
	appName = 'c15t',
	telemetryConfig?: TelemetryConfig
): TelemetryConfig {
	const config: TelemetryConfig = {
		// Opt-in: disabled by default, must be explicitly enabled
		enabled: telemetryConfig?.enabled ?? false,
		tracer: telemetryConfig?.tracer,
		meter: telemetryConfig?.meter,

		defaultAttributes: {
			...(telemetryConfig?.defaultAttributes || {}),

			// Always ensure these core attributes are set
			// (will override user values if they exist)
			'service.name': String(appName),
			'service.version': version,
		},
	};

	return config;
}

/**
 * Checks if telemetry is enabled
 */
export function isTelemetryEnabled(options?: C15TOptions): boolean {
	return options?.advanced?.telemetry?.enabled === true;
}

/**
 * Gets the tracer for the c15t backend
 * Returns the user-provided tracer or falls back to the global tracer
 */
export const getTracer = (options?: C15TOptions) => {
	if (!isTelemetryEnabled(options)) {
		// Return a no-op tracer when telemetry is disabled
		return trace.getTracer('c15t-noop');
	}
	if (options?.advanced?.telemetry?.tracer) {
		return options.advanced.telemetry.tracer;
	}
	return trace.getTracer(options?.appName ?? 'c15t');
};

/**
 * Gets the meter for the c15t backend
 * Returns the user-provided meter or falls back to the global meter
 */
export const getMeter = (options?: C15TOptions): Meter => {
	if (!isTelemetryEnabled(options)) {
		// Return a no-op meter when telemetry is disabled
		return metrics.getMeter('c15t-noop');
	}
	if (options?.advanced?.telemetry?.meter) {
		return options.advanced.telemetry.meter;
	}
	return metrics.getMeter(options?.appName ?? 'c15t');
};

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
	const span = tracer.startSpan(`${method} ${path}`, {
		attributes: {
			'http.method': method,
			'http.path': path,
			...(options?.advanced?.telemetry?.defaultAttributes || {}),
		},
	});

	return span;
};

/**
 * Wraps an API request handler in a span
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
		const result = await operation();
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
const handleSpanError = (span: Span, error: unknown) => {
	span.setStatus({
		code: SpanStatusCode.ERROR,
		message: error instanceof Error ? error.message : String(error),
	});

	if (error instanceof Error) {
		span.setAttribute('error.type', error.name);
		span.setAttribute('error.message', error.message);
		if (error.stack) {
			span.setAttribute('error.stack', error.stack);
		}
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
