/**
 * @fileoverview Analytics contracts for c15t v2 system.
 * Defines the API contracts for analytics event processing using ORPC.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Base analytics event schema for validation.
 */
const BaseAnalyticsEventSchema = z.object({
	type: z.enum(['track', 'page', 'identify', 'group', 'alias', 'consent']),
	userId: z.string().optional(),
	anonymousId: z.string(),
	sessionId: z.string(),
	timestamp: z.string(),
	messageId: z.string(),
	context: z
		.object({
			page: z
				.object({
					path: z.string(),
					title: z.string(),
					url: z.string(),
				})
				.optional(),
			userAgent: z.string().optional(),
			ip: z.string().optional(),
			referrer: z.string().optional(),
			locale: z.string().optional(),
			timezone: z.string().optional(),
			custom: z.record(z.string(), z.unknown()).optional(),
		})
		.optional(),
});

/**
 * Track event schema.
 */
const TrackEventSchema = BaseAnalyticsEventSchema.extend({
	type: z.literal('track'),
	name: z.string(),
	properties: z.record(z.string(), z.unknown()),
});

/**
 * Page event schema.
 */
const PageEventSchema = BaseAnalyticsEventSchema.extend({
	type: z.literal('page'),
	name: z.string().optional(),
	properties: z.record(z.string(), z.unknown()),
});

/**
 * Identify event schema.
 */
const IdentifyEventSchema = BaseAnalyticsEventSchema.extend({
	type: z.literal('identify'),
	traits: z.record(z.string(), z.unknown()),
});

/**
 * Group event schema.
 */
const GroupEventSchema = BaseAnalyticsEventSchema.extend({
	type: z.literal('group'),
	groupId: z.string(),
	traits: z.record(z.string(), z.unknown()),
});

/**
 * Alias event schema.
 */
const AliasEventSchema = BaseAnalyticsEventSchema.extend({
	type: z.literal('alias'),
	previousId: z.string(),
});

/**
 * Consent event schema.
 */
const ConsentEventSchema = BaseAnalyticsEventSchema.extend({
	type: z.literal('consent'),
	action: z.enum(['granted', 'revoked', 'updated']),
	preferences: z.record(z.string(), z.boolean()),
	source: z.enum(['banner', 'api', 'admin']),
});

/**
 * Union schema for all analytics events.
 */
const AnalyticsEventSchema = z.discriminatedUnion('type', [
	TrackEventSchema,
	PageEventSchema,
	IdentifyEventSchema,
	GroupEventSchema,
	AliasEventSchema,
	ConsentEventSchema,
]);

/**
 * Consent settings schema.
 */
const ConsentSchema = z.object({
	necessary: z.boolean(),
	measurement: z.boolean(),
	marketing: z.boolean(),
	functionality: z.boolean(),
	experience: z.boolean(),
});

/**
 * Batch upload request schema.
 */
const AnalyticsUploadRequestSchema = z.object({
	events: z.array(AnalyticsEventSchema),
	consent: ConsentSchema,
});

/**
 * Analytics processing response schema.
 */
const AnalyticsResponseSchema = z.object({
	success: z.boolean(),
	processed: z.number(),
	filtered: z.number(),
	errors: z.number(),
	results: z.array(
		z.object({
			eventId: z.string(),
			status: z.enum(['processed', 'filtered', 'error']),
			destination: z.string().optional(),
			error: z.string().optional(),
		})
	),
	processedAt: z.string(),
});

/**
 * Analytics contracts definition.
 */
export const analyticsContracts = {
	/**
	 * Process analytics events batch.
	 *
	 * @description
	 * Processes a batch of analytics events through the consent validation
	 * and destination routing pipeline.
	 *
	 * @param request - The analytics upload request containing events and consent
	 * @returns Processing results with success/failure status for each event
	 *
	 * @throws {ValidationError} When request validation fails
	 * @throws {ProcessingError} When event processing fails
	 *
	 * @example
	 * ```typescript
	 * const result = await analytics.process({
	 *   events: [
	 *     {
	 *       type: 'track',
	 *       name: 'Button Clicked',
	 *       properties: { buttonId: 'header-cta' },
	 *       anonymousId: 'anon-123',
	 *       sessionId: 'session-456',
	 *       timestamp: new Date().toISOString(),
	 *       messageId: 'msg-789'
	 *     }
	 *   ],
	 *   consent: {
	 *     necessary: true,
	 *     measurement: true,
	 *     marketing: false,
	 *     functionality: false,
	 *     experience: false
	 *   }
	 * });
	 * ```
	 */
	process: oc
		.input(AnalyticsUploadRequestSchema)
		.output(AnalyticsResponseSchema)
		.meta({
			description: 'Process analytics events batch',
			tags: ['analytics'],
		}),

	/**
	 * Health check for analytics service.
	 *
	 * @description
	 * Returns the current status and configuration of the analytics service.
	 *
	 * @returns Service status and configuration information
	 *
	 * @example
	 * ```typescript
	 * const status = await analytics.health();
	 * console.log(status.status); // 'healthy'
	 * ```
	 */
	health: oc
		.input(z.void())
		.output(
			z.object({
				status: z.enum(['healthy', 'degraded', 'unhealthy']),
				service: z.string(),
				version: z.string(),
				destinations: z.array(
					z.object({
						type: z.string(),
						enabled: z.boolean(),
						status: z.enum(['connected', 'disconnected', 'error']),
					})
				),
				timestamp: z.string(),
			})
		)
		.meta({
			description: 'Analytics service health check',
			tags: ['analytics', 'health'],
		}),
};
