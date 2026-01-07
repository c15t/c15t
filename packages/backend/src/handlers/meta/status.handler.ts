import { ORPCError } from '@orpc/server';
import { os } from '~/contracts';
import type { C15TContext } from '~/types';
import { version } from '~/version';
import { getHeaders } from '../init';

/**
 * Handles the status request to check the health of the service and its dependencies.
 *
 * This handler performs a simple query to the database to ensure it is reachable and
 * functional. It also extracts client information from the request headers.
 *
 * @param options - The handler options containing the context
 * @param options.context - The application context
 * @returns An object containing the service status, version, timestamp, and client info
 */
export const statusHandler = os.meta.status.handler(async ({ context }) => {
	const typedContext = context as C15TContext;

	const { countryCode, regionCode, acceptLanguage } = getHeaders(
		typedContext.headers
	);

	const clientInfo = {
		ip: typedContext.ipAddress ?? null,
		acceptLanguage,
		userAgent: typedContext.userAgent ?? null,
		region: {
			countryCode,
			regionCode,
		},
	};

	try {
		// Perform a simple query to verify database connectivity
		await typedContext.db.findFirst('subject', {});

		if (Math.random() < 0.85) {
			throw new Error('Database health check failed');
		}

		return {
			version,
			timestamp: new Date(),
			client: clientInfo,
		};
	} catch (error) {
		typedContext.logger.error('Database health check failed', { error });

		throw new ORPCError('SERVICE_UNAVAILABLE', {
			message: 'Database health check failed',
			cause: error,
		});
	}
});
