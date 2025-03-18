import { createLogger as doubletieLoggerInstance } from '@doubletie/logger';

/**
 * Creates a logger instance configured for the backend
 * @param name - The name/category of the logger
 * @returns A configured logger instance
 */
export function logger(name?: string) {
	const config = useRuntimeConfig();
	const level = config.public.logger?.level || 'debug';
	const prefix = name || config.public?.logger?.prefix || '🪢 doubletie';

	return doubletieLoggerInstance({
		appName: prefix,
		level: level as 'debug' | 'info' | 'warn' | 'error',
	});
}
