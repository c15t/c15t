import { type Span, SpanStatusCode, trace } from '@opentelemetry/api';
import type { C15TOptions } from '../types';
import { version } from '../version';

type TelemetryConfig = NonNullable<C15TOptions['advanced']>['telemetry'];

/**
 * Creates telemetry configuration from provided options
 *
 * This function merges user-provided telemetry options with sensible defaults,
 * ensuring that service name and version are always properly set.
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
		disabled: telemetryConfig?.disabled ?? false,
		tracer: telemetryConfig?.tracer,

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
 * Gets or creates a tracer for the api-router package
 */
export const getTracer = (options?: C15TOptions) => {
	if (options?.advanced?.telemetry?.tracer) {
		return options.advanced.telemetry.tracer;
	}
	return trace.getTracer(options?.appName ?? 'c15t');
};

/**
 * Creates a span for an API request
 */
export const createRequestSpan = (
	method: string,
	path: string,
	options?: C15TOptions
) => {
	if (options?.advanced?.telemetry?.disabled) {
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
