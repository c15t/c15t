import type { C15TContext } from '~/types/context';
import { isOriginTrusted } from './is-origin-trusted';

/**
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
	context: C15TContext,
	trustedOrigins?: string[]
): C15TContext => {
	const origin = request.headers.get('origin');
	if (origin && trustedOrigins) {
		const trusted = isOriginTrusted(origin, trustedOrigins, context.logger);

		context.origin = origin;
		context.trustedOrigin = trusted;
	}
	return context;
};
