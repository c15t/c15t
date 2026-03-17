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
import type { C15TEdgeOptions } from './types';

export type { InitPayload };

/**
 * Creates an edge-compatible /init handler.
 *
 * The returned function accepts a standard `Request` and returns a `Response`.
 * It has no dependency on Hono or any database adapter, making it suitable for
 * edge runtimes such as Vercel Middleware, Cloudflare Workers, or Deno Deploy.
 *
 * @example
 * ```ts
 * // middleware.ts (Vercel Edge)
 * import { c15tEdgeInit } from '@c15t/backend/edge';
 *
 * const initHandler = c15tEdgeInit({
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
export function c15tEdgeInit(
	options: C15TEdgeOptions
): (request: Request) => Promise<Response> {
	// Construction-time validation (same checks the full init performs)
	const logger: Logger = createLogger(options.logger);

	validateMessages({
		customTranslations: options.customTranslations,
		i18n: options.i18n,
		policies: options.policyPacks,
	});

	if (options.policyPacks) {
		inspectPolicies(options.policyPacks, {
			iabEnabled: options.iab?.enabled === true,
		});
	}

	return async (request: Request): Promise<Response> => {
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: buildCorsHeaders(request, options.trustedOrigins, logger),
			});
		}

		try {
			const payload = await resolveInitPayload(request, options, logger);
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
		'access-control-allow-headers': 'content-type, accept-language',
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
