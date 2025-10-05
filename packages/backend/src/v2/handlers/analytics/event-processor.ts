/**
 * @fileoverview Event processor for c15t analytics.
 * Handles event validation, enrichment, and filtering before sending to destinations.
 */

import type { Logger } from '@doubletie/logger';
import type {
	AnalyticsEvent,
	ConsentPurpose,
	EventContext,
	SpecificAnalyticsEvent,
} from './core-types';

/**
 * Configuration for event processing.
 */
export interface EventProcessorConfig {
	/** Whether to enable event validation */
	enableValidation?: boolean;
	/** Whether to enable event enrichment */
	enableEnrichment?: boolean;
	/** Whether to enable global filtering */
	enableGlobalFiltering?: boolean;
	/** Whether to enable consent-based filtering */
	enableConsentFiltering?: boolean;
	/** Global event filters */
	globalFilters?: EventFilter[];
	/** Maximum number of events to process in a single batch */
	maxBatchSize?: number;
}

/**
 * Event filter function type.
 */
export type EventFilter = (
	event: AnalyticsEvent,
	context: EventContext
) => boolean;

/**
 * Default event processor configuration.
 */
export const DEFAULT_EVENT_PROCESSOR_CONFIG: Required<EventProcessorConfig> = {
	enableValidation: true,
	enableEnrichment: true,
	enableGlobalFiltering: true,
	enableConsentFiltering: true,
	globalFilters: [],
	maxBatchSize: 1000,
};

/**
 * Event processor that validates, enriches, and filters analytics events.
 *
 * This class provides:
 * - Event validation using Standard Schema
 * - Event enrichment with context data
 * - Global event filtering
 * - Consent-based filtering per destination
 * - Special handling for consent events
 *
 * @example
 * ```typescript
 * const processor = new EventProcessor(logger);
 * const processedEvents = await processor.processEvents(events, context);
 * ```
 */
export class EventProcessor {
	private readonly logger: Logger;
	private readonly config: Required<EventProcessorConfig>;

	constructor(logger: Logger, config: EventProcessorConfig = {}) {
		this.logger = logger;
		this.config = { ...DEFAULT_EVENT_PROCESSOR_CONFIG, ...config };

		this.logger.info('Event processor initialized', {
			config: this.config,
		});
	}

	/**
	 * Process a batch of events through validation, enrichment, and filtering.
	 *
	 * @param events - Array of analytics events to process
	 * @param context - Event context containing session and consent data
	 * @returns Promise resolving to processed events
	 *
	 * @throws {Error} When batch size exceeds maximum allowed
	 *
	 * @example
	 * ```typescript
	 * const processedEvents = await processor.processEvents(events, context);
	 * ```
	 */
	async processEvents(
		events: AnalyticsEvent[],
		context: EventContext
	): Promise<AnalyticsEvent[]> {
		this.logger.debug('Processing events', {
			eventCount: events.length,
			sessionId: context.sessionId,
		});

		// Check batch size
		if (events.length > this.config.maxBatchSize) {
			throw new Error(
				`Batch size ${events.length} exceeds maximum allowed ${this.config.maxBatchSize}`
			);
		}

		let processedEvents = [...events];

		// Step 1: Validate events
		if (this.config.enableValidation) {
			processedEvents = this.validateEvents(processedEvents);
		}

		// Step 2: Enrich events with context
		if (this.config.enableEnrichment) {
			processedEvents = this.enrichEvents(processedEvents, context);
		}

		// Step 3: Apply global filtering
		if (this.config.enableGlobalFiltering) {
			processedEvents = this.applyGlobalFilters(processedEvents, context);
		}

		this.logger.debug('Events processed successfully', {
			originalCount: events.length,
			processedCount: processedEvents.length,
			filteredCount: events.length - processedEvents.length,
		});

		return processedEvents;
	}

	/**
	 * Filter events based on consent requirements for a specific destination.
	 *
	 * @param events - Array of events to filter
	 * @param context - Event context containing consent data
	 * @param requiredConsent - Required consent purposes for the destination
	 * @returns Filtered events that meet consent requirements
	 *
	 * @example
	 * ```typescript
	 * const filteredEvents = processor.filterEventsByConsent(
	 *   events,
	 *   context,
	 *   ['measurement', 'marketing']
	 * );
	 * ```
	 */
	filterEventsByConsent(
		events: AnalyticsEvent[],
		context: EventContext,
		requiredConsent: readonly ConsentPurpose[]
	): AnalyticsEvent[] {
		if (!this.config.enableConsentFiltering) {
			return events;
		}

		this.logger.debug('Filtering events by consent', {
			eventCount: events.length,
			requiredConsent,
			userConsent: context.consent,
		});

		const filteredEvents: AnalyticsEvent[] = [];

		for (const event of events) {
			// Consent events are always sent to all destinations
			if (this.isConsentEvent(event)) {
				filteredEvents.push(event);
				continue;
			}

			// Check if user has granted all required consent purposes
			const hasRequiredConsent = requiredConsent.every(
				(purpose) => context.consent[purpose] === true
			);

			if (hasRequiredConsent) {
				filteredEvents.push(event);
			} else {
				this.logger.debug('Event filtered due to insufficient consent', {
					eventType: event.type,
					eventName: event.name,
					requiredConsent,
					userConsent: context.consent,
				});
			}
		}

		this.logger.debug('Consent filtering completed', {
			originalCount: events.length,
			filteredCount: filteredEvents.length,
			filteredOut: events.length - filteredEvents.length,
		});

		return filteredEvents;
	}

	/**
	 * Validate events against Standard Schema.
	 *
	 * @param events - Array of events to validate
	 * @returns Valid events
	 * @throws {Error} When validation fails
	 *
	 * @internal
	 */
	private validateEvents(events: AnalyticsEvent[]): AnalyticsEvent[] {
		this.logger.debug('Validating events', { eventCount: events.length });

		const validEvents: AnalyticsEvent[] = [];

		for (const event of events) {
			try {
				this.validateEvent(event);
				validEvents.push(event);
			} catch (error) {
				this.logger.warn('Event validation failed', {
					eventType: event.type,
					eventName: event.name,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		this.logger.debug('Event validation completed', {
			originalCount: events.length,
			validCount: validEvents.length,
			invalidCount: events.length - validEvents.length,
		});

		return validEvents;
	}

	/**
	 * Validate a single event against its schema.
	 *
	 * @param event - Event to validate
	 * @throws {Error} When validation fails
	 *
	 * @internal
	 */
	private validateEvent(event: AnalyticsEvent): void {
		// Basic required field validation
		if (!event.type) {
			throw new Error('Event type is required');
		}

		if (!event.timestamp) {
			throw new Error('Event timestamp is required');
		}

		if (!event.anonymousId && !event.userId) {
			throw new Error('Event must have either anonymousId or userId');
		}

		// Validate specific event types
		switch (event.type) {
			case 'track':
				this.validateTrackEvent(event as SpecificAnalyticsEvent<'track'>);
				break;
			case 'page':
				this.validatePageEvent(event as SpecificAnalyticsEvent<'page'>);
				break;
			case 'identify':
				this.validateIdentifyEvent(event as SpecificAnalyticsEvent<'identify'>);
				break;
			case 'group':
				this.validateGroupEvent(event as SpecificAnalyticsEvent<'group'>);
				break;
			case 'alias':
				this.validateAliasEvent(event as SpecificAnalyticsEvent<'alias'>);
				break;
			case 'consent':
				this.validateConsentEvent(event as SpecificAnalyticsEvent<'consent'>);
				break;
			default:
				throw new Error(`Unknown event type: ${event.type}`);
		}
	}

	/**
	 * Validate a track event.
	 *
	 * @param event - Track event to validate
	 * @throws {Error} When validation fails
	 *
	 * @internal
	 */
	private validateTrackEvent(event: SpecificAnalyticsEvent<'track'>): void {
		if (!event.name || event.name === '') {
			throw new Error('Track event name is required');
		}
	}

	/**
	 * Validate a page event.
	 *
	 * @param event - Page event to validate
	 * @throws {Error} When validation fails
	 *
	 * @internal
	 */
	private validatePageEvent(event: SpecificAnalyticsEvent<'page'>): void {
		if (!event.name || event.name === '') {
			throw new Error('Page event name is required');
		}
	}

	/**
	 * Validate an identify event.
	 *
	 * @param event - Identify event to validate
	 * @throws {Error} When validation fails
	 *
	 * @internal
	 */
	private validateIdentifyEvent(
		event: SpecificAnalyticsEvent<'identify'>
	): void {
		if (!event.userId || event.userId === '') {
			throw new Error('Identify event userId is required');
		}
	}

	/**
	 * Validate a group event.
	 *
	 * @param event - Group event to validate
	 * @throws {Error} When validation fails
	 *
	 * @internal
	 */
	private validateGroupEvent(event: SpecificAnalyticsEvent<'group'>): void {
		if (!event.groupId || event.groupId === '') {
			throw new Error('Group event groupId is required');
		}
	}

	/**
	 * Validate an alias event.
	 *
	 * @param event - Alias event to validate
	 * @throws {Error} When validation fails
	 *
	 * @internal
	 */
	private validateAliasEvent(event: SpecificAnalyticsEvent<'alias'>): void {
		if (!event.properties || !event.properties.previousId) {
			throw new Error('Alias event previousId is required');
		}
	}

	/**
	 * Validate a consent event.
	 *
	 * @param event - Consent event to validate
	 * @throws {Error} When validation fails
	 *
	 * @internal
	 */
	private validateConsentEvent(event: SpecificAnalyticsEvent<'consent'>): void {
		if (!event.properties || !event.properties.action) {
			throw new Error('Consent event action is required');
		}

		const validActions = ['granted', 'revoked', 'updated'];
		if (!validActions.includes(event.properties.action)) {
			throw new Error(`Invalid consent action: ${event.properties.action}`);
		}
	}

	/**
	 * Enrich events with context data.
	 *
	 * @param events - Array of events to enrich
	 * @param context - Event context to add to events
	 * @returns Enriched events
	 *
	 * @internal
	 */
	private enrichEvents(
		events: AnalyticsEvent[],
		context: EventContext
	): AnalyticsEvent[] {
		this.logger.debug('Enriching events with context', {
			eventCount: events.length,
			sessionId: context.sessionId,
		});

		return events.map((event) => ({
			...event,
			// Add context data to event
			context: {
				...event.context,
				sessionId: context.sessionId,
				sessionStart: context.sessionStart,
				userAgent: context.userAgent,
				ip: context.ip,
				referrer: context.referrer,
			},
		}));
	}

	/**
	 * Apply global filters to events.
	 *
	 * @param events - Array of events to filter
	 * @param context - Event context for filtering
	 * @returns Filtered events
	 *
	 * @internal
	 */
	private applyGlobalFilters(
		events: AnalyticsEvent[],
		context: EventContext
	): AnalyticsEvent[] {
		if (this.config.globalFilters.length === 0) {
			return events;
		}

		this.logger.debug('Applying global filters', {
			eventCount: events.length,
			filterCount: this.config.globalFilters.length,
		});

		let filteredEvents = events;

		for (const filter of this.config.globalFilters) {
			const beforeCount = filteredEvents.length;
			filteredEvents = filteredEvents.filter((event) => filter(event, context));
			const afterCount = filteredEvents.length;

			if (beforeCount !== afterCount) {
				this.logger.debug('Global filter applied', {
					filteredOut: beforeCount - afterCount,
					remaining: afterCount,
				});
			}
		}

		return filteredEvents;
	}

	/**
	 * Check if an event is a consent event.
	 *
	 * @param event - Event to check
	 * @returns True if the event is a consent event
	 *
	 * @internal
	 */
	private isConsentEvent(event: AnalyticsEvent): boolean {
		return event.type === 'consent';
	}

	/**
	 * Get processor configuration.
	 *
	 * @returns Current processor configuration
	 */
	getConfig(): EventProcessorConfig {
		return { ...this.config };
	}

	/**
	 * Update processor configuration.
	 *
	 * @param config - New configuration to merge
	 */
	updateConfig(config: Partial<EventProcessorConfig>): void {
		Object.assign(this.config, config);
		this.logger.info('Processor configuration updated', {
			config: this.config,
		});
	}
}
