/**
 * Edge-compatible /init handler — runs as a pure Request → Response function
 * without Hono or a database adapter.
 *
 * @packageDocumentation
 */

import { createLogger, type Logger } from '@c15t/logger';
import { inspectPolicies } from '~/handlers/init/policy';
import {
	type InitPayload,
	resolveInitPayload,
} from '~/handlers/init/resolve-init';
import { validateMessages } from '~/handlers/init/translations';
import { isOriginTrusted } from '~/middleware/cors/is-origin-trusted';
import type { C15TRequestContext } from '~/types';
import type { C15TEdgeOptions } from './types';

export type { InitPayload };

type C15TEdgeHandler = {
	(request: Request, runtimeContext: unknown): Promise<Response>;
	(request: Request, requestContext: C15TRequestContext): Promise<Response>;
	(request: Request): Promise<Response>;
};

/**
 * Creates an edge-compatible /init handler.
 *
 * The returned function accepts a standard `Request` and an optional request
 * context. Netlify Edge Functions pass `context` as the second argument, which
 * supplies country and subdivision via `context.geo`.
 *
 * It has no dependency on Hono or any database adapter, making it suitable for
 * edge runtimes such as Vercel Middleware, Cloudflare Workers, Deno Deploy,
 * or Netlify Edge Functions.
 *
 * @param options - Edge policy, translation, CORS, and snapshot options.
 * @returns An edge-compatible request handler for the `/init` payload.
 * @throws {Error} If translation or policy validation fails during setup.
 * @experimental This API is unstable in 2.0 and may change or be removed.
 *
 * @example
 * ```ts
 * // middleware.ts (Vercel Edge)
 * import { unstable_c15tEdgeInit } from '@c15t/backend/edge';
 *
 * const initHandler = unstable_c15tEdgeInit({
 *   trustedOrigins: ['https://myapp.com'],
 *   policyPacks: [
 *     { id: 'eu', match: { countries: ['DE', 'FR'] }, consent: { model: 'opt-in' }, ui: { mode: 'banner' } },
 *   ],
 *   policySnapshot: { signingKey: process.env.SNAPSHOT_KEY! },
 * });
 *
 * export async function middleware(request: Request) {
 *   const url = new URL(request.url);
 *   if (url.pathname === '/api/consent/init') {
 *     return initHandler(request);
 *   }
 * }
 * ```
 */
export function unstable_c15tEdgeInit(
	options: C15TEdgeOptions
): C15TEdgeHandler {
	// Construction-time validation (same checks the full init performs)
	const logger: Logger = createLogger(options.logger);

	const validation = validateMessages({
		customTranslations: options.customTranslations,
		i18n: options.i18n,
		policies: options.policyPacks,
	});

	if (validation.errors.length > 0) {
		throw new Error(
			`Edge init validation failed: ${validation.errors.join(', ')}`
		);
	}

	for (const warning of validation.warnings) {
		logger.warn(warning);
	}

	if (options.policyPacks) {
		inspectPolicies(options.policyPacks, {
			iabEnabled: options.iab?.enabled === true,
		});
	}

	return async (
		request: Request,
		requestContext?: unknown
	): Promise<Response> => {
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: buildCorsHeaders(request, options.trustedOrigins, logger),
			});
		}

		try {
			const payload = await resolveInitPayload(
				request,
				options,
				logger,
				(requestContext as C15TRequestContext | undefined)?.geo
			);
			const headers = new Headers({
				'content-type': 'application/json',
			});
			applyCorsHeaders(headers, request, options.trustedOrigins, logger);

			return new Response(JSON.stringify(payload), {
				status: 200,
				headers,
			});
		} catch (error) {
			logger.error('Edge init handler error', error);
			const errorHeaders = new Headers({ 'content-type': 'application/json' });
			applyCorsHeaders(errorHeaders, request, options.trustedOrigins, logger);
			return new Response(
				JSON.stringify({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Internal server error',
					status: 500,
				}),
				{
					status: 500,
					headers: errorHeaders,
				}
			);
		}
	};
}

/**
 * Build CORS headers for a preflight response.
 */
function buildCorsHeaders(
	request: Request,
	trustedOrigins: string[],
	logger?: Logger
): Record<string, string> {
	const origin = request.headers.get('origin');
	const headers: Record<string, string> = {
		'access-control-allow-methods': 'GET, OPTIONS',
		'access-control-allow-headers':
			'content-type, accept-language, x-c15t-version',
		'access-control-max-age': '86400',
	};

	if (origin && isTrusted(origin, trustedOrigins, logger)) {
		headers['access-control-allow-origin'] = origin;
		headers.vary = 'Origin';
	}

	return headers;
}

/**
 * Apply CORS headers to an existing Headers object.
 */
function applyCorsHeaders(
	headers: Headers,
	request: Request,
	trustedOrigins: string[],
	logger?: Logger
): void {
	const origin = request.headers.get('origin');
	if (origin && isTrusted(origin, trustedOrigins, logger)) {
		headers.set('access-control-allow-origin', origin);
		headers.set('vary', 'Origin');
	}
}

/**
 * Thin wrapper around isOriginTrusted that handles empty trusted-origin lists
 * gracefully (isOriginTrusted throws on empty arrays).
 */
function isTrusted(
	origin: string,
	trustedOrigins: string[],
	logger?: Logger
): boolean {
	if (trustedOrigins.length === 0) {
		return false;
	}
	return isOriginTrusted(origin, trustedOrigins, logger);
}
