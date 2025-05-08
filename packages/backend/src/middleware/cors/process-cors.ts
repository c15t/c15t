import type { Logger } from '@doubletie/logger';
import { isOriginTrusted } from './is-origin-trusted';

/**
 * Interface representing the middleware context
 */
interface MiddlewareContext {
	logger?: Logger;
	adapter: unknown;
	registry: unknown;
	generateId: unknown;
	ipAddress?: string;
	origin?: string;
	trustedOrigin?: boolean;
	path?: string;
	method?: string;
	headers?: Headers;
	userAgent?: string;
	[key: string]: unknown;
}

/**
 * Process CORS validation and add it to the context
 *
 * @param request - The incoming request
 * @param context - The middleware context to enrich
 * @param trustedOrigins - Array of trusted origin patterns
 * @returns The enriched context
 */
export const processCors = (
	request: Request,
	context: MiddlewareContext,
	trustedOrigins?: string[]
): MiddlewareContext => {
	const origin = request.headers.get('origin');
	if (origin && trustedOrigins) {
		const trusted = isOriginTrusted(origin, trustedOrigins, context.logger);

		context.origin = origin;
		context.trustedOrigin = trusted;
	}
	return context;
};
