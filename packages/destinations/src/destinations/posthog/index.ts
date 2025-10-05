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
import { PostHogClient } from './client';

/**
 * PostHog destination settings schema
 */
const PostHogSettingsSchema = z.object({
	apiKey: z.string().min(1, 'API key is required'),
	host: z.string().url().optional().default('https://app.posthog.com'),
	flushAt: z.number().min(1).max(1000).optional().default(20),
	flushInterval: z.number().min(1000).optional().default(10000),
});

export type PostHogSettings = z.infer<typeof PostHogSettingsSchema>;

/**
 * PostHog destination implementation
 *
 * Sends analytics events to PostHog for product analytics.
 * Supports all event types with proper GDPR consent filtering.
 */
export class PostHogDestination implements DestinationPlugin<PostHogSettings> {
	readonly type = 'posthog';
	readonly name = 'PostHog';
	readonly description = 'PostHog product analytics destination';
	readonly category = 'analytics' as const;
	readonly version = '1.0.0';
	readonly gdprCompliant = true;
	// Note: Zod schemas are incompatible with StandardSchemaV1 interface
	// Using unknown instead of any for better type safety
	readonly settingsSchema =
		PostHogSettingsSchema as unknown as StandardSchemaV1<PostHogSettings>;
	readonly requiredConsent: readonly ConsentPurpose[] = [
		'measurement',
	] as const;

	private settings: PostHogSettings;
	private client: PostHogClient | null = null;
	private logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
		this.settings = {} as PostHogSettings; // Will be set in initialize
	}

	/**
	 * Initialize the PostHog destination with settings
	 */
	async initialize(settings: PostHogSettings): Promise<void> {
		try {
			// Validate settings using Zod schema
			this.settings = PostHogSettingsSchema.parse(settings);

			// Initialize PostHog client
			this.client = new PostHogClient({
				apiKey: this.settings.apiKey,
				host: this.settings.host || 'https://app.posthog.com',
				flushAt: this.settings.flushAt || 20,
				flushInterval: this.settings.flushInterval || 10000,
				logger: this.logger,
			});

			this.logger.info('PostHog destination initialized', {
				host: this.settings.host || 'https://app.posthog.com',
				flushAt: this.settings.flushAt || 20,
				flushInterval: this.settings.flushInterval || 10000,
			});
		} catch (error) {
			this.logger.error('Failed to initialize PostHog destination', { error });
			throw error;
		}
	}

	/**
	 * Test connection to PostHog API
	 */
	async testConnection(): Promise<boolean> {
		if (!this.client) {
			this.logger.warn('PostHog client not initialized');
			return false;
		}

		try {
			// Test with a simple identify call
			await this.client.identify({
				distinctId: 'test-connection',
				properties: { test: true, timestamp: new Date().toISOString() },
			});

			this.logger.info('PostHog connection test successful');
			return true;
		} catch (error) {
			this.logger.error('PostHog connection test failed', { error });
			return false;
		}
	}

	/**
	 * Handle track events
	 */
	async track(event: TrackEvent, context: EventContext): Promise<void> {
		if (!this.client) {
			throw new Error('PostHog client not initialized');
		}

		try {
			await this.client.capture({
				distinctId: context.userId || context.anonymousId || 'anonymous',
				event: event.name,
				properties: {
					...event.properties,
					$lib: 'c15t',
					$lib_version: this.version,
					session_id: context.sessionId,
					timestamp: event.timestamp,
				},
				timestamp: event.timestamp,
			});

			this.logger.debug('Track event sent to PostHog', {
				eventName: event.name,
				distinctId: context.userId || context.anonymousId,
			});
		} catch (error) {
			this.logger.error('Failed to send track event to PostHog', {
				eventName: event.name,
				error,
			});
			throw error;
		}
	}

	/**
	 * Handle page events
	 */
	async page(event: PageEvent, context: EventContext): Promise<void> {
		if (!this.client) {
			throw new Error('PostHog client not initialized');
		}

		try {
			await this.client.capture({
				distinctId: context.userId || context.anonymousId || 'anonymous',
				event: '$pageview',
				properties: {
					$current_url: event.name,
					...event.properties,
					$lib: 'c15t',
					$lib_version: this.version,
					session_id: context.sessionId,
					timestamp: event.timestamp,
				},
				timestamp: event.timestamp,
			});

			this.logger.debug('Page event sent to PostHog', {
				pageName: event.name,
				distinctId: context.userId || context.anonymousId,
			});
		} catch (error) {
			this.logger.error('Failed to send page event to PostHog', {
				pageName: event.name,
				error,
			});
			throw error;
		}
	}

	/**
	 * Handle identify events
	 */
	async identify(event: IdentifyEvent, context: EventContext): Promise<void> {
		if (!this.client) {
			throw new Error('PostHog client not initialized');
		}

		try {
			await this.client.identify({
				distinctId: event.userId || 'anonymous',
				properties: event.traits,
			});

			this.logger.debug('Identify event sent to PostHog', {
				userId: event.userId,
			});
		} catch (error) {
			this.logger.error('Failed to send identify event to PostHog', {
				userId: event.userId,
				error,
			});
			throw error;
		}
	}

	/**
	 * Handle group events
	 */
	async group(event: GroupEvent, context: EventContext): Promise<void> {
		if (!this.client) {
			throw new Error('PostHog client not initialized');
		}

		try {
			await this.client.groupIdentify({
				groupType: 'organization',
				groupKey: event.groupId,
				properties: event.traits,
			});

			this.logger.debug('Group event sent to PostHog', {
				groupId: event.groupId,
			});
		} catch (error) {
			this.logger.error('Failed to send group event to PostHog', {
				groupId: event.groupId,
				error,
			});
			throw error;
		}
	}

	/**
	 * Handle alias events
	 */
	async alias(event: AliasEvent, context: EventContext): Promise<void> {
		if (!this.client) {
			throw new Error('PostHog client not initialized');
		}

		try {
			await this.client.alias({
				distinctId: context.userId || context.anonymousId || 'anonymous',
				alias: String(event.properties.previousId),
			});

			this.logger.debug('Alias event sent to PostHog', {
				previousId: event.properties.previousId,
				distinctId: context.userId || context.anonymousId,
			});
		} catch (error) {
			this.logger.error('Failed to send alias event to PostHog', {
				previousId: event.properties.previousId,
				error,
			});
			throw error;
		}
	}

	/**
	 * Handle consent events
	 */
	async consent(event: ConsentEvent, context: EventContext): Promise<void> {
		if (!this.client) {
			throw new Error('PostHog client not initialized');
		}

		try {
			await this.client.capture({
				distinctId: context.userId || context.anonymousId || 'anonymous',
				event: 'Consent Updated',
				properties: {
					action: event.properties.action,
					source: event.properties.source,
					previousConsent: event.properties.previousConsent,
					$lib: 'c15t',
					$lib_version: this.version,
					timestamp: event.timestamp,
				},
				timestamp: event.timestamp,
			});

			this.logger.debug('Consent event sent to PostHog', {
				action: event.properties.action,
				source: event.properties.source,
			});
		} catch (error) {
			this.logger.error('Failed to send consent event to PostHog', {
				action: event.properties.action,
				error,
			});
			throw error;
		}
	}

	/**
	 * Handle errors gracefully
	 */
	async onError(error: Error, event: AnalyticsEvent): Promise<void> {
		this.logger.error('PostHog destination error', {
			eventType: event.type,
			error: error.message,
			stack: error.stack,
		});
		// Don't throw - let the system continue processing other destinations
	}

	/**
	 * Cleanup resources
	 */
	async destroy(): Promise<void> {
		if (this.client) {
			await this.client.shutdown();
			this.client = null;
		}
		this.logger.info('PostHog destination destroyed');
	}
}

/**
 * Factory function to create PostHog destination configuration
 */
export function createPostHogDestination(settings: PostHogSettings) {
	return {
		type: 'posthog',
		enabled: true,
		settings,
		requiredConsent: ['measurement'] as const,
	};
}
