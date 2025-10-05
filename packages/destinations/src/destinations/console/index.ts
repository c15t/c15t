import type {
	AliasEvent,
	AnalyticsEvent,
	ConsentEvent,
	ConsentPurpose,
	DestinationPlugin,
	EventContext,
	GroupEvent,
	IdentifyEvent,
	PageEvent,
	TrackEvent,
} from '@c15t/backend/v2';
import type { Logger } from '@doubletie/logger';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { z } from 'zod';

/**
 * Console destination settings schema
 */
const ConsoleSettingsSchema = z.object({
	logLevel: z
		.enum(['debug', 'info', 'warn', 'error'])
		.optional()
		.default('info'),
	includeContext: z.boolean().optional().default(true),
	includeTimestamp: z.boolean().optional().default(true),
	includeEventId: z.boolean().optional().default(true),
});

export type ConsoleSettings = z.infer<typeof ConsoleSettingsSchema>;

/**
 * Console destination implementation
 *
 * Logs analytics events to the console for debugging and development.
 * Always works and requires minimal consent.
 */
export class ConsoleDestination implements DestinationPlugin<ConsoleSettings> {
	readonly type = 'console';
	readonly name = 'Console';
	readonly description = 'Console logging destination for debugging';
	readonly category = 'other' as const;
	readonly version = '1.0.0';
	readonly gdprCompliant = true;
	// Note: Zod schemas are incompatible with StandardSchemaV1 interface
	// Using unknown instead of any for better type safety
	readonly settingsSchema =
		ConsoleSettingsSchema as unknown as StandardSchemaV1<ConsoleSettings>;
	readonly requiredConsent: readonly ConsentPurpose[] = ['necessary'] as const;

	private settings: ConsoleSettings;
	private logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
		this.settings = {} as ConsoleSettings; // Will be set in initialize
	}

	/**
	 * Initialize the Console destination with settings
	 */
	async initialize(settings: ConsoleSettings): Promise<void> {
		try {
			// Validate settings using Zod schema
			this.settings = ConsoleSettingsSchema.parse(settings);

			this.logger.info('Console destination initialized', {
				logLevel: this.settings.logLevel,
				includeContext: this.settings.includeContext,
				includeTimestamp: this.settings.includeTimestamp,
				includeEventId: this.settings.includeEventId,
			});
		} catch (error) {
			this.logger.error('Failed to initialize Console destination', { error });
			throw error;
		}
	}

	/**
	 * Test connection (console always works)
	 */
	async testConnection(): Promise<boolean> {
		this.logger.debug('Console connection test (always succeeds)');
		return true;
	}

	/**
	 * Handle track events
	 */
	async track(event: TrackEvent, context: EventContext): Promise<void> {
		this.log('track', event, context);
	}

	/**
	 * Handle page events
	 */
	async page(event: PageEvent, context: EventContext): Promise<void> {
		this.log('page', event, context);
	}

	/**
	 * Handle identify events
	 */
	async identify(event: IdentifyEvent, context: EventContext): Promise<void> {
		this.log('identify', event, context);
	}

	/**
	 * Handle group events
	 */
	async group(event: GroupEvent, context: EventContext): Promise<void> {
		this.log('group', event, context);
	}

	/**
	 * Handle alias events
	 */
	async alias(event: AliasEvent, context: EventContext): Promise<void> {
		this.log('alias', event, context);
	}

	/**
	 * Handle consent events
	 */
	async consent(event: ConsentEvent, context: EventContext): Promise<void> {
		this.log('consent', event, context);
	}

	/**
	 * Log event data to console
	 */
	private log(
		eventType: string,
		event: AnalyticsEvent,
		context: EventContext
	): void {
		const logData: Record<string, unknown> = {
			type: eventType,
			event: {
				type: event.type,
				timestamp: event.timestamp,
				messageId: event.messageId,
				anonymousId: event.anonymousId,
				sessionId: event.sessionId,
			},
		};

		// Add event-specific data
		switch (eventType) {
			case 'track':
				logData.event = {
					...(logData.event as any),
					name: (event as TrackEvent).name,
					properties: (event as TrackEvent).properties,
				};
				break;
			case 'page':
				logData.event = {
					...(logData.event as any),
					name: (event as PageEvent).name,
					properties: (event as PageEvent).properties,
				};
				break;
			case 'identify':
				logData.event = {
					...(logData.event as any),
					userId: (event as IdentifyEvent).userId,
					traits: (event as IdentifyEvent).traits,
				};
				break;
			case 'group':
				logData.event = {
					...(logData.event as any),
					groupId: (event as GroupEvent).groupId,
					traits: (event as GroupEvent).traits,
				};
				break;
			case 'alias':
				logData.event = {
					...(logData.event as any),
					properties: (event as AliasEvent).properties,
				};
				break;
			case 'consent':
				logData.event = {
					...(logData.event as any),
					properties: (event as ConsentEvent).properties,
				};
				break;
		}

		// Add context if enabled
		if (this.settings.includeContext) {
			logData.context = {
				sessionId: context.sessionId,
				sessionStart: context.sessionStart,
				userAgent: context.userAgent,
				ip: context.ip,
				referrer: context.referrer,
				consent: context.consent,
			};
		}

		// Add timestamp if enabled
		if (this.settings.includeTimestamp) {
			logData.logTimestamp = new Date().toISOString();
		}

		// Add event ID if enabled
		if (this.settings.includeEventId) {
			logData.eventId = event.messageId;
		}

		// Use appropriate console method based on log level
		const logMessage = `[c15t:console] ${eventType}:`;

		switch (this.settings.logLevel) {
			case 'debug':
				console.debug(logMessage, logData);
				break;
			case 'info':
				console.info(logMessage, logData);
				break;
			case 'warn':
				console.warn(logMessage, logData);
				break;
			case 'error':
				console.error(logMessage, logData);
				break;
		}

		this.logger.debug('Event logged to console', {
			eventType,
			eventId: event.messageId,
			logLevel: this.settings.logLevel,
		});
	}

	/**
	 * Handle errors gracefully
	 */
	async onError(error: Error, event: AnalyticsEvent): Promise<void> {
		const errorData = {
			eventType: event.type,
			eventId: event.messageId,
			error: error.message,
			stack: error.stack,
		};

		console.error('[c15t:console] Error processing event:', errorData);

		this.logger.error('Console destination error', errorData);
		// Don't throw - let the system continue processing other destinations
	}

	/**
	 * Cleanup resources (no-op for console)
	 */
	async destroy(): Promise<void> {
		this.logger.info('Console destination destroyed');
	}
}

/**
 * Factory function to create Console destination configuration
 */
export function createConsoleDestination(
	settings: ConsoleSettings = {
		logLevel: 'info',
		includeContext: true,
		includeTimestamp: true,
		includeEventId: true,
	}
) {
	return {
		type: 'console',
		enabled: true,
		settings,
		requiredConsent: ['necessary'] as const,
	};
}
