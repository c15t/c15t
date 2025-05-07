import { oc } from '@orpc/contract';
import { z } from 'zod';

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

Use this endpoint for health checks, monitoring, and service status verification.`,
		tags: ['meta'],
	})
	.output(
		z.object({
			status: z.enum(['ok', 'error']),
			version: z.string(),
			timestamp: z.date(),
			storage: z.object({
				type: z.string(),
				available: z.boolean(),
			}),
		})
	);
