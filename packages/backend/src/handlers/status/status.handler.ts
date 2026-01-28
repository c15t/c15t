/**
 * GET /status handler - Health check and status endpoint.
 *
 * @packageDocumentation
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { C15TContext } from '~/types';
import { version } from '~/version';
import { getHeaders } from '../init';

/**
 * Handles the status request to check the health of the service and its dependencies.
 *
 * This handler performs a simple query to the database to ensure it is reachable and
 * functional. It also extracts client information from the request headers.
 */
export const statusHandler = async (c: Context) => {
	const ctx = c.get('c15tContext') as C15TContext;

	const { countryCode, regionCode, acceptLanguage } = getHeaders(ctx.headers);

	const clientInfo = {
		ip: ctx.ipAddress ?? null,
		acceptLanguage,
		userAgent: ctx.userAgent ?? null,
		region: {
			countryCode,
			regionCode,
		},
	};

	try {
		// Perform a simple query to verify database connectivity
		await ctx.db.findFirst('subject', {});

		return c.json({
			version,
			timestamp: new Date(),
			client: clientInfo,
		});
	} catch (error) {
		ctx.logger.error('Database health check failed', { error });

		throw new HTTPException(503, {
			message: 'Database health check failed',
			cause: { code: 'SERVICE_UNAVAILABLE', error },
		});
	}
};
