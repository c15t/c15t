/**
 * @fileoverview Analytics process handler for c15t v2 system.
 * Handles processing of analytics events batch using the EventProcessor and DestinationManager.
 */

import type { Logger } from '@doubletie/logger';
import { ORPCError } from '@orpc/server';
import { os } from '../../contracts';
import type { C15TContext } from '../../types';
import type { AnalyticsEvent, EventContext } from './types';

/**
 * Custom error classes for analytics processing
 */
export class AnalyticsError extends Error {
	constructor(
		message: string,
		public code: string,
		public statusCode = 400
	) {
		super(message);
		this.name = 'AnalyticsError';
	}
}

export class ValidationError extends AnalyticsError {
	constructor(
		message: string,
		public field?: string
	) {
		super(message, 'VALIDATION_ERROR', 400);
	}
}

export class RateLimitError extends AnalyticsError {
	constructor() {
		super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429);
	}
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
	return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handle consent events by updating the database
 */
async function handleConsentEvents(
	consentEvents: AnalyticsEvent[],
	context: EventContext,
	logger: Logger
): Promise<void> {
	for (const event of consentEvents) {
		if (event.type === 'consent') {
			try {
				// TODO: Implement consent database update
				// This would integrate with the existing consent management system
				logger.info('Consent event processed', {
					sessionId: context.sessionId,
					userId: context.userId,
					action: (event as any).action,
					source: (event as any).source,
				});
			} catch (error: unknown) {
				logger.error('Failed to process consent event', {
					error: error instanceof Error ? error.message : String(error),
					sessionId: context.sessionId,
					eventId: event.messageId,
				});
			}
		}
	}
}
/**
 * Process analytics events batch handler.
 *
 * @param input - The analytics upload request
 * @param context - The c15t context
 * @returns Processing results
 *
 * @throws {ORPCError} When validation or processing fails
 */
export const processAnalyticsEvents = os.analytics.process.handler(
	async ({ input, context }) => {
		const typedContext = context as C15TContext;
		const logger = typedContext.logger;

		try {
			// Validate input
			if (!input.events || !Array.isArray(input.events)) {
				throw new ValidationError('Events array is required');
			}

			if (!input.consent) {
				throw new ValidationError('Consent object is required');
			}

			// Generate session ID if not provided
			const finalSessionId = input.events[0]?.sessionId || generateSessionId();

			// Create event context
			const eventContext: EventContext = {
				sessionId: finalSessionId,
				sessionStart: new Date(),
				userId: input.events[0]?.userId,
				anonymousId: input.events[0]?.anonymousId,
				consent: input.consent,
				userAgent: input.events[0]?.context?.userAgent,
				ip: input.events[0]?.context?.ip,
				referrer: input.events[0]?.context?.referrer,
				custom: input.events[0]?.context?.custom,
			};

			// Get EventProcessor and DestinationManager from context
			const eventProcessor = (typedContext as any).eventProcessor;
			const destinationManager = typedContext.destinationManager;

			if (!eventProcessor) {
				throw new AnalyticsError(
					'Event processor not available',
					'SERVICE_UNAVAILABLE',
					503
				);
			}

			if (!destinationManager) {
				throw new AnalyticsError(
					'Destination manager not available',
					'SERVICE_UNAVAILABLE',
					503
				);
			}

			// Process events through EventProcessor
			const processedEvents = await eventProcessor.processEvents(
				input.events,
				eventContext
			);

			// Route to destinations
			await destinationManager.processEvents(processedEvents, eventContext);

			// Handle consent events specially
			const consentEvents = input.events.filter((e) => e.type === 'consent');
			if (consentEvents.length > 0) {
				await handleConsentEvents(consentEvents, eventContext, logger);
			}

			// Log successful processing
			logger.info('Events processed successfully', {
				eventCount: input.events.length,
				processedCount: processedEvents.length,
				sessionId: finalSessionId,
				userId: eventContext.userId,
			});

			// Return success response
			return {
				success: true,
				processed: processedEvents.length,
				filtered: input.events.length - processedEvents.length,
				errors: 0,
				results: processedEvents.map(
					(event: AnalyticsEvent, index: number) => ({
						eventId: event.messageId || `event-${index}`,
						status: 'processed' as const,
						destination: 'analytics-pipeline',
					})
				),
				processedAt: new Date().toISOString(),
			};
		} catch (error: unknown) {
			logger.error('Failed to process analytics events', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				input: {
					eventCount: input.events?.length || 0,
					hasConsent: !!input.consent,
				},
			});

			if (error instanceof AnalyticsError) {
				throw new ORPCError('BAD_REQUEST', {
					message: error.message,
				});
			}

			if (error instanceof ORPCError) {
				throw error;
			}

			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Failed to process analytics events',
			});
		}
	}
);
