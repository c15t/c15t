import { defu } from 'defu';
import { createError, defineEventHandler, getRequestURL } from 'h3';
import { useRuntimeConfig } from '#imports';
import type { C15TContext, C15TOptions } from '../types';
import { logger } from '../utils/logger';

// Global context store
let globalContext: C15TContext | null = null;

/**
 * Initialize the global context with options
 *
 * @param options - Configuration options for the C15T context
 * @returns The initialized context object
 * @throws Error if secret is not provided
 */
export function initContext(options: C15TOptions): C15TContext {
	const config = useRuntimeConfig();

	// Default options with provided options
	const defaultOptions = {
		baseURL: config.public.apiBase || '/api',
	} as Partial<C15TOptions>;

	const mergedOptions = defu(options, defaultOptions) as C15TOptions;

	if (!mergedOptions.secret) {
		throw new Error('Secret is required to initialize C15T context');
	}

	globalContext = {
		baseURL: mergedOptions.baseURL || '/api',
		secret: mergedOptions.secret,
		logger: logger(),
	};

	globalContext.logger.info('Context initialized', {
		baseURL: globalContext.baseURL,
	});

	return globalContext;
}

/**
 * Get the global context or throw an error if not initialized
 *
 * @returns The global C15T context
 * @throws H3Error if context not initialized
 */
export function getContext(): C15TContext {
	if (!globalContext) {
		logger().error(
			'Context not initialized - this should happen in the init plugin'
		);
		throw createError({
			statusCode: 500,
			message: 'C15T context not initialized',
			cause: new Error('Context initialization failed or did not run'),
		});
	}

	return globalContext;
}

/**
 * Middleware to attach context to each request
 */
export default defineEventHandler((event) => {
  try {
    // Attach context to event
    const context = getContext();
    event.context.c15t = context;

    // Create request-specific logger
    context.logger.debug('Request context initialized', {
      path: event.path,
      method: event.method,
    });
  } catch (error) {
    const context = getContext();
    const url = getRequestURL(event);
    
    // Log error and throw for all routes
    context.logger.error(`Context initialization error for ${url.pathname}:`, {
      error,
    });
    throw error;
  }
});