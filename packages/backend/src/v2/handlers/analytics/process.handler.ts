/**
 * @fileoverview Analytics process handler for c15t v2 system.
 * Handles processing of analytics events batch using the plugin system.
 */

import { ORPCError } from '@orpc/server';
import { os } from '../../contracts';
import type { C15TContext } from '../../types';
import type { AnalyticsConsent, AnalyticsEvent, EventContext } from './types';
import { EVENT_PURPOSE_MAP } from './types';

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

		try {
			/**
			 * Validate consent for an analytics event.
			 */
			const validateConsent = (
				event: AnalyticsEvent,
				consent: AnalyticsConsent
			): boolean => {
				const eventType = event.type as keyof typeof EVENT_PURPOSE_MAP;
				const requiredPurpose = EVENT_PURPOSE_MAP[eventType];

				// Check if user has given consent for the required purpose
				return consent[requiredPurpose as keyof AnalyticsConsent] === true;
			};

			/**
			 * Filter events based on consent.
			 */
			const filterEventsByConsent = (
				events: AnalyticsEvent[],
				consent: AnalyticsConsent
			): AnalyticsEvent[] => {
				return events.filter((event) => validateConsent(event, consent));
			};

			// Validate input
			if (!input.events || !Array.isArray(input.events)) {
				throw new ORPCError('BAD_REQUEST', {
					message: 'Events array is required',
				});
			}

			if (!input.consent) {
				throw new ORPCError('BAD_REQUEST', {
					message: 'Consent object is required',
				});
			}

			// Filter events by consent
			const eventsWithConsent = filterEventsByConsent(
				input.events,
				input.consent
			);

			// Get destination manager from context
			const destinationManager = typedContext.destinationManager;

			if (!destinationManager) {
				throw new ORPCError('INTERNAL_SERVER_ERROR', {
					message: 'Destination manager not available',
				});
			}

			// Process events through destination manager
			const context: EventContext = {
				sessionId: input.events[0]?.sessionId || 'unknown',
				sessionStart: new Date(),
				consent: input.consent,
			};
			await destinationManager.processEvents(eventsWithConsent, context);

			// Return success response
			return {
				success: true,
				processed: eventsWithConsent.length,
				filtered: input.events.length - eventsWithConsent.length,
				errors: 0,
				results: eventsWithConsent.map((event, index) => ({
					eventId: event.messageId || `event-${index}`,
					status: 'processed' as const,
					destination: 'plugin-system',
				})),
				processedAt: new Date().toISOString(),
			};
		} catch (error) {
			console.error('Analytics processing error:', error);

			if (error instanceof ORPCError) {
				throw error;
			}

			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Failed to process analytics events',
			});
		}
	}
);
