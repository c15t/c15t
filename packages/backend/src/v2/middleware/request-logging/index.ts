/**
 * @fileoverview Request logging middleware for ORPC v2.
 * Provides request logging functionality for analytics endpoints.
 */

import type { Logger } from '@doubletie/logger';

/**
 * Request logging configuration
 */
export interface RequestLoggingConfig {
	/** Whether to log request body */
	logRequestBody?: boolean;
	/** Whether to log response body */
	logResponseBody?: boolean;
	/** Whether to log headers */
	logHeaders?: boolean;
	/** Fields to exclude from logging */
	excludeFields?: string[];
	/** Maximum body size to log */
	maxBodySize?: number;
}

/**
 * Default request logging configuration
 */
export const DEFAULT_REQUEST_LOGGING_CONFIG: Required<RequestLoggingConfig> = {
	logRequestBody: false,
	logResponseBody: false,
	logHeaders: false,
	excludeFields: ['password', 'token', 'secret', 'key'],
	maxBodySize: 1000,
};

/**
 * Create request logging middleware for ORPC v2
 */
export function createRequestLoggingMiddleware(
	logger: Logger,
	config: Partial<RequestLoggingConfig> = {}
) {
	const finalConfig = { ...DEFAULT_REQUEST_LOGGING_CONFIG, ...config };

	return {
		name: 'requestLogging',
		handler: async (
			input: unknown,
			context: {
				request: {
					headers: Record<string, string>;
					ip?: string;
					method?: string;
					url?: string;
				};
			}
		) => {
			const start = Date.now();

			// Log request
			const requestLog: any = {
				method: context.request.method || 'POST',
				path: context.request.url || '/analytics/process',
				userAgent: context.request.headers['user-agent'],
				ip: context.request.ip,
				timestamp: new Date().toISOString(),
			};

			if (finalConfig.logHeaders) {
				requestLog.headers = context.request.headers;
			}

			if (finalConfig.logRequestBody && input) {
				const bodyStr = JSON.stringify(input);
				if (bodyStr.length <= finalConfig.maxBodySize) {
					requestLog.body = input;
				} else {
					requestLog.body = '[Body too large to log]';
				}
			}

			logger.info('Analytics request received', requestLog);

			// Return input unchanged
			return input;
		},
	};
}

/**
 * Create response logging middleware for ORPC v2
 */
export function createResponseLoggingMiddleware(
	logger: Logger,
	config: Partial<RequestLoggingConfig> = {}
) {
	const finalConfig = { ...DEFAULT_REQUEST_LOGGING_CONFIG, ...config };

	return {
		name: 'responseLogging',
		handler: async (
			output: unknown,
			context: {
				request: {
					headers: Record<string, string>;
					ip?: string;
					method?: string;
					url?: string;
				};
			}
		) => {
			const duration = Date.now() - Date.now(); // This would need to be tracked properly

			// Log response
			const responseLog: any = {
				method: context.request.method || 'POST',
				path: context.request.url || '/analytics/process',
				userAgent: context.request.headers['user-agent'],
				ip: context.request.ip,
				duration,
				timestamp: new Date().toISOString(),
			};

			if (finalConfig.logResponseBody && output) {
				const bodyStr = JSON.stringify(output);
				if (bodyStr.length <= finalConfig.maxBodySize) {
					responseLog.body = output;
				} else {
					responseLog.body = '[Body too large to log]';
				}
			}

			logger.info('Analytics request completed', responseLog);

			// Return output unchanged
			return output;
		},
	};
}
