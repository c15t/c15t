import { statusOutputSchema } from '@c15t/schema';
import { oc } from '@orpc/contract';

export const statusContract = oc
	.route({
		method: 'GET',
		path: '/status',
		description: `Returns the current operational status and health metrics of the service.
This endpoint provides real-time information about:
- Overall service status (ok/error)
- Current API version
- Server timestamp
- Storage system status and availability
- Client information (IP, User Agent, Region)

Use this endpoint for health checks, monitoring, and service status verification.`,
		tags: ['meta'],
	})
	.output(statusOutputSchema)
	.errors({
		SERVICE_UNAVAILABLE: {
			message: 'Database health check failed',
			status: 503,
		},
	});
