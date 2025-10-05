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
 *
 * @internal
 * Defines the configuration options available for the console destination.
 * All settings are optional with sensible defaults for development use.
 */
const ConsoleSettingsSchema = z.object({
	/**
	 * Log level for console output
	 * @default 'info'
	 */
	logLevel: z
		.enum(['debug', 'info', 'warn', 'error'])
		.optional()
		.default('info'),

	/**
	 * Whether to include event context in logs
	 * @default true
	 */
	includeContext: z.boolean().optional().default(true),

	/**
	 * Whether to include timestamp in logs
	 * @default true
	 */
	includeTimestamp: z.boolean().optional().default(true),

	/**
	 * Whether to include event ID in logs
	 * @default true
	 */
	includeEventId: z.boolean().optional().default(true),
});

/**
 * Configuration settings for the console destination
 *
 * @typeParam SettingsType - The type of settings object (inferred from schema)
 */
export type ConsoleSettings = z.infer<typeof ConsoleSettingsSchema>;

/**
 * Console destination implementation for server-side analytics debugging
 *
 * Logs analytics events to the server console for debugging and development.
 * This destination is primarily for server-side logging and does not generate
 * client-side scripts since console logging happens automatically in browsers.
 *
 * @typeParam SettingsType - The settings type for this destination
 *
 * @example
 * ```typescript
 * const consoleDest = new ConsoleDestination(logger);
 * await consoleDest.initialize({
 *   logLevel: 'debug',
 *   includeContext: true
 * });
 * ```
 */
export class ConsoleDestination implements DestinationPlugin<ConsoleSettings> {
	/** @internal */
	readonly type = 'console';

	/** @internal */
	readonly name = 'Console';

	/** @internal */
	readonly description = 'Console logging destination for debugging';

	/** @internal */
	readonly category = 'other' as const;

	/** @internal */
	readonly version = '1.0.0';

	/** @internal */
	readonly gdprCompliant = true;

	/**
	 * Settings schema for validation
	 * @internal
	 * Note: Zod schemas are incompatible with StandardSchemaV1 interface
	 * Using unknown instead of any for better type safety
	 */
	readonly settingsSchema =
		ConsoleSettingsSchema as unknown as StandardSchemaV1<ConsoleSettings>;

	/** @internal */
	readonly requiredConsent: readonly ConsentPurpose[] = ['necessary'] as const;

	/** @internal */
	private settings: ConsoleSettings;

	/** @internal */
	private logger: Logger;

	/**
	 * Creates a new console destination instance
	 *
	 * @param logger - Logger instance for internal logging
	 *
	 * @throws {Error} When logger is not provided
	 */
	constructor(logger: Logger) {
		if (!logger) {
			throw new Error('Logger is required for ConsoleDestination');
		}
		this.logger = logger;
		this.settings = {} as ConsoleSettings; // Will be set in initialize
	}

	/**
	 * Initializes the console destination with validated settings
	 *
	 * @param settings - Configuration settings for the console destination
	 * @returns Promise that resolves when initialization is complete
	 *
	 * @throws {ZodError} When settings validation fails
	 * @throws {Error} When initialization encounters an unexpected error
	 *
	 * @example
	 * ```typescript
	 * await consoleDest.initialize({
	 *   logLevel: 'debug',
	 *   includeContext: true,
	 *   includeTimestamp: true,
	 *   includeEventId: false
	 * });
	 * ```
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
	 * Tests the connection to the console destination
	 *
	 * @returns Promise that always resolves to true since console logging always works
	 *
	 * @example
	 * ```typescript
	 * const isConnected = await consoleDest.testConnection();
	 * console.log('Console destination connected:', isConnected); // Always true
	 * ```
	 */
	async testConnection(): Promise<boolean> {
		this.logger.debug('Console connection test (always succeeds)');
		return true;
	}

	/**
	 * Handles track events by logging them to the console
	 *
	 * @param event - The track event to log
	 * @param context - Event context containing session and user data
	 * @returns Promise that resolves when logging is complete
	 *
	 * @example
	 * ```typescript
	 * await consoleDest.track({
	 *   type: 'track',
	 *   name: 'Button Clicked',
	 *   properties: { buttonId: 'submit-btn' },
	 *   timestamp: new Date().toISOString(),
	 *   messageId: 'msg-123'
	 * }, context);
	 * ```
	 */
	async track(event: TrackEvent, context: EventContext): Promise<void> {
		this.log('track', event, context);
	}

	/**
	 * Handles page events by logging them to the console
	 *
	 * @param event - The page event to log
	 * @param context - Event context containing session and user data
	 * @returns Promise that resolves when logging is complete
	 */
	async page(event: PageEvent, context: EventContext): Promise<void> {
		this.log('page', event, context);
	}

	/**
	 * Handles identify events by logging them to the console
	 *
	 * @param event - The identify event to log
	 * @param context - Event context containing session and user data
	 * @returns Promise that resolves when logging is complete
	 */
	async identify(event: IdentifyEvent, context: EventContext): Promise<void> {
		this.log('identify', event, context);
	}

	/**
	 * Handles group events by logging them to the console
	 *
	 * @param event - The group event to log
	 * @param context - Event context containing session and user data
	 * @returns Promise that resolves when logging is complete
	 */
	async group(event: GroupEvent, context: EventContext): Promise<void> {
		this.log('group', event, context);
	}

	/**
	 * Handles alias events by logging them to the console
	 *
	 * @param event - The alias event to log
	 * @param context - Event context containing session and user data
	 * @returns Promise that resolves when logging is complete
	 */
	async alias(event: AliasEvent, context: EventContext): Promise<void> {
		this.log('alias', event, context);
	}

	/**
	 * Handles consent events by logging them to the console
	 *
	 * @param event - The consent event to log
	 * @param context - Event context containing session and user data
	 * @returns Promise that resolves when logging is complete
	 */
	async consent(event: ConsentEvent, context: EventContext): Promise<void> {
		this.log('consent', event, context);
	}

	/**
	 * Logs event data to the server console with appropriate formatting
	 *
	 * @internal
	 * @param eventType - The type of event being logged
	 * @param event - The analytics event to log
	 * @param context - Event context containing session and user data
	 *
	 * @throws {Error} When console logging fails (rare, but possible in some environments)
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
					...(logData.event as Record<string, unknown>),
					name: (event as TrackEvent).name,
					properties: (event as TrackEvent).properties,
				};
				break;
			case 'page':
				logData.event = {
					...(logData.event as Record<string, unknown>),
					name: (event as PageEvent).name,
					properties: (event as PageEvent).properties,
				};
				break;
			case 'identify':
				logData.event = {
					...(logData.event as Record<string, unknown>),
					userId: (event as IdentifyEvent).userId,
					traits: (event as IdentifyEvent).traits,
				};
				break;
			case 'group':
				logData.event = {
					...(logData.event as Record<string, unknown>),
					groupId: (event as GroupEvent).groupId,
					traits: (event as GroupEvent).traits,
				};
				break;
			case 'alias':
				logData.event = {
					...(logData.event as Record<string, unknown>),
					properties: (event as AliasEvent).properties,
				};
				break;
			case 'consent':
				logData.event = {
					...(logData.event as Record<string, unknown>),
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
	 * Handles errors that occur during event processing
	 *
	 * @param error - The error that occurred
	 * @param event - The event that was being processed when the error occurred
	 * @returns Promise that resolves when error handling is complete
	 *
	 * @example
	 * ```typescript
	 * await consoleDest.onError(new Error('Processing failed'), event);
	 * ```
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
	 * Cleans up resources when the destination is destroyed
	 *
	 * @returns Promise that resolves when cleanup is complete
	 *
	 * @example
	 * ```typescript
	 * await consoleDest.destroy();
	 * ```
	 */
	async destroy(): Promise<void> {
		this.logger.info('Console destination destroyed');
	}
}

/**
 * Factory function to create a console destination configuration
 *
 * @param settings - Optional configuration settings for the console destination
 * @returns Destination configuration object ready for use with c15t analytics
 *
 * @example
 * ```typescript
 * // Create with default settings
 * const config = createConsoleDestination();
 *
 * // Create with custom settings
 * const config = createConsoleDestination({
 *   logLevel: 'debug',
 *   includeContext: true,
 *   includeTimestamp: false,
 *   includeEventId: true
 * });
 * ```
 *
 * @see {@link ConsoleSettings} for available configuration options
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
