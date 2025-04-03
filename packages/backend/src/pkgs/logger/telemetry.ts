import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { LogLevel, LoggerOptions } from './types';

const LOGGER_TRACER_NAME = '@doubletie/logger';

/**
 * Maps log levels to OpenTelemetry span status codes
 */
const LOG_LEVEL_TO_SPAN_STATUS: Record<LogLevel, SpanStatusCode> = {
	error: SpanStatusCode.ERROR,
	warn: SpanStatusCode.ERROR,
	info: SpanStatusCode.OK,
	success: SpanStatusCode.OK,
	debug: SpanStatusCode.OK,
};

/**
 * Gets or creates a tracer for the logger package
 */
export const getTracer = (options?: LoggerOptions) => {
	if (options?.telemetry?.tracer) {
		return options.telemetry.tracer;
	}
	return trace.getTracer(LOGGER_TRACER_NAME);
};

/**
 * Creates a span for a log entry and sets appropriate attributes
 */
export const createLogSpan = (
	level: LogLevel,
	message: string,
	args: unknown[] = [],
	options?: LoggerOptions
) => {
	if (options?.telemetry?.disabled) {
		return null;
	}

	const tracer = getTracer(options);
	const span = tracer.startSpan('log_entry', {
		attributes: {
			'log.level': level,
			'log.message': message,
			'log.has_args': args.length > 0,
			...(options?.telemetry?.defaultAttributes || {}),
		},
	});

	// Add any structured data as span attributes
	if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
		const data = args[0] as Record<string, unknown>;
		for (const [key, value] of Object.entries(data)) {
			if (value !== undefined && value !== null) {
				span.setAttribute(`log.data.${key}`, String(value));
			}
		}
	}

	// Set span status based on log level
	span.setStatus({
		code: LOG_LEVEL_TO_SPAN_STATUS[level],
		message: level === 'error' || level === 'warn' ? message : undefined,
	});

	return span;
};

/**
 * Wraps a logging operation in a span
 */
export const withLogSpan = async <T>(
	level: LogLevel,
	message: string,
	args: unknown[],
	operation: () => T | Promise<T>,
	options?: LoggerOptions
): Promise<T> => {
	const span = createLogSpan(level, message, args, options);
	if (!span) {
		return operation();
	}

	try {
		const result = await operation();
		return result;
	} catch (error) {
		span.setStatus({
			code: SpanStatusCode.ERROR,
			message: error instanceof Error ? error.message : String(error),
		});
		throw error;
	} finally {
		span.end();
	}
};
