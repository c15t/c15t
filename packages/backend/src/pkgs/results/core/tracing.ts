import { type Span, SpanStatusCode, context, trace } from '@opentelemetry/api';
import { DoubleTieError } from './error-class';

const tracer = trace.getTracer('@doubletie/results');

/**
 * Creates and manages a span for a function execution
 *
 * @param name - Name of the span
 * @param fn - Function to execute within the span
 * @param attributes - Optional attributes to add to the span
 * @returns The result of the function execution
 */
export async function withSpan<T>(
	name: string,
	fn: (span: Span) => Promise<T> | T,
	attributes: Record<string, string | number | boolean> = {}
): Promise<T> {
	return await tracer.startActiveSpan(name, async (span) => {
		try {
			// Add attributes
			span.setAttributes(attributes);

			// Execute the function
			const result = await fn(span);

			// End the span successfully
			span.setStatus({ code: SpanStatusCode.OK });
			span.end();

			return result;
		} catch (error) {
			// Handle errors and add error details to the span
			if (error instanceof DoubleTieError) {
				span.setAttributes({
					'error.type': 'DoubleTieError',
					'error.code': error.code,
					'error.status': error.status,
					'error.message': error.message,
				});

				if (error.meta) {
					span.setAttributes({
						'error.meta': JSON.stringify(error.meta),
					});
				}
			} else {
				span.setAttributes({
					'error.type':
						error instanceof Error ? error.constructor.name : 'Unknown',
					'error.message':
						error instanceof Error ? error.message : String(error),
				});
			}

			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: error instanceof Error ? error.message : String(error),
			});

			span.end();
			throw error;
		}
	});
}

/**
 * Creates a child span for the current active span
 *
 * @param name - Name of the child span
 * @param fn - Function to execute within the child span
 * @param attributes - Optional attributes to add to the span
 * @returns The result of the function execution
 */
export async function withChildSpan<T>(
	name: string,
	fn: (span: Span) => Promise<T> | T,
	attributes: Record<string, string | number | boolean> = {}
): Promise<T> {
	const parentContext = trace.getActiveSpan()?.spanContext();
	if (!parentContext) {
		return withSpan(name, fn, attributes);
	}

	return await tracer.startActiveSpan(
		name,
		{ attributes },
		context.active(),
		async (span) => {
			try {
				const result = await fn(span);
				span.setStatus({ code: SpanStatusCode.OK });
				span.end();
				return result;
			} catch (error) {
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : String(error),
				});
				span.end();
				throw error;
			}
		}
	);
}
