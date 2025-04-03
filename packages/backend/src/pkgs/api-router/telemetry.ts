import { type Span, SpanStatusCode, trace } from '@opentelemetry/api';
import type { DoubleTieOptions } from '../types/options';

const API_ROUTER_TRACER_NAME = '@doubletie/api-router';

/**
 * Gets or creates a tracer for the api-router package
 */
export const getTracer = (options?: DoubleTieOptions) => {
	if (options?.telemetry?.tracer) {
		return options.telemetry.tracer;
	}
	return trace.getTracer(API_ROUTER_TRACER_NAME);
};

/**
 * Creates a span for an API request
 */
export const createRequestSpan = (
	method: string,
	path: string,
	options?: DoubleTieOptions
) => {
	if (options?.telemetry?.disabled) {
		return null;
	}

	const tracer = getTracer(options);
	const span = tracer.startSpan(`${method} ${path}`, {
		attributes: {
			'http.method': method,
			'http.path': path,
			...(options?.telemetry?.defaultAttributes || {}),
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
	options?: DoubleTieOptions
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
