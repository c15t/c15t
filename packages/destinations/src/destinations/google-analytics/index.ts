/**
 * @fileoverview Google Analytics universal destination implementation.
 *
 * Provides both server-side Measurement Protocol integration and client-side
 * gtag.js script generation for Google Analytics 4 tracking with
 * full GDPR compliance.
 */

import type {
	AliasEvent,
	AnalyticsConsent,
	ConsentEvent,
	ConsentPurpose,
	EventContext,
	GroupEvent,
	IdentifyEvent,
	PageEvent,
	TrackEvent,
	UniversalDestinationPlugin,
	UniversalScript,
} from '@c15t/backend/v2';
import type { Logger } from '@doubletie/logger';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { z } from 'zod';

/**
 * Settings schema for Google Analytics destination
 *
 * @public
 * Validates configuration for Google Analytics 4 integration including
 * measurement ID, API secret, and feature toggles.
 */
export const GoogleAnalyticsSettingsSchema = z.object({
	measurementId: z.string().min(1, 'Measurement ID is required'),
	apiSecret: z.string().min(1, 'API Secret is required'),
	enableServerSide: z.boolean().default(true),
	enableClientSide: z.boolean().default(true),
	enableEnhancedMeasurement: z.boolean().default(true),
	anonymizeIp: z.boolean().default(true),
	cookieFlags: z.string().default('SameSite=None;Secure'),
	customParameters: z.record(z.string(), z.unknown()).optional(),
	debugMode: z.boolean().default(false),
});

/**
 * Google Analytics settings type
 *
 * @public
 * TypeScript type for Google Analytics configuration
 */
export type GoogleAnalyticsSettings = z.infer<
	typeof GoogleAnalyticsSettingsSchema
>;

/**
 * Google Analytics specific error types
 *
 * @public
 * Custom error classes for Google Analytics operations
 */
export class GoogleAnalyticsError extends Error {
	constructor(
		message: string,
		public code: string,
		public statusCode?: number
	) {
		super(message);
		this.name = 'GoogleAnalyticsError';
	}
}

export class MeasurementProtocolError extends GoogleAnalyticsError {
	constructor(message: string, statusCode: number) {
		super(message, 'MEASUREMENT_PROTOCOL_ERROR', statusCode);
	}
}

export class GtagScriptError extends GoogleAnalyticsError {
	constructor(message: string) {
		super(message, 'GTAG_SCRIPT_ERROR');
	}
}

/**
 * Google Analytics universal destination implementation
 *
 * @public
 * Implements both server-side Measurement Protocol calls and client-side
 * gtag.js script generation for Google Analytics 4 tracking.
 */
export class GoogleAnalyticsDestination
	implements UniversalDestinationPlugin<GoogleAnalyticsSettings>
{
	readonly type = 'google-analytics';
	readonly name = 'Google Analytics';
	readonly description = 'Google Analytics 4 web analytics destination';
	readonly category = 'analytics' as const;
	readonly version = '1.0.0';
	readonly gdprCompliant = true;
	readonly settingsSchema =
		GoogleAnalyticsSettingsSchema as unknown as StandardSchemaV1<GoogleAnalyticsSettings>;
	readonly requiredConsent: ReadonlyArray<ConsentPurpose> = ['measurement'];

	private settings: GoogleAnalyticsSettings | null = null;
	private logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	/**
	 * Initialize the Google Analytics destination with settings
	 *
	 * @param settings - Google Analytics configuration
	 * @throws {ZodError} When settings validation fails
	 */
	async initialize(settings: GoogleAnalyticsSettings): Promise<void> {
		this.settings = GoogleAnalyticsSettingsSchema.parse(settings);
		this.logger.info('Google Analytics destination initialized', {
			measurementId: this.settings.measurementId,
			enableServerSide: this.settings.enableServerSide,
			enableClientSide: this.settings.enableClientSide,
			enableEnhancedMeasurement: this.settings.enableEnhancedMeasurement,
		});
	}

	/**
	 * Test connection to Google Analytics Measurement Protocol
	 *
	 * @returns Promise resolving to true if connection successful
	 */
	async testConnection(): Promise<boolean> {
		if (!this.settings) {
			throw new Error('Google Analytics destination not initialized');
		}

		try {
			// Test Measurement Protocol connection
			const testEvent = {
				client_id: 'test-client-id',
				events: [
					{
						name: 'test_event',
						params: {
							test: true,
							timestamp_micros: Date.now() * 1000,
						},
					},
				],
			};

			const response = await fetch(
				`https://www.google-analytics.com/mp/collect?measurement_id=${this.settings.measurementId}&api_secret=${this.settings.apiSecret}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(testEvent),
				}
			);

			return response.ok;
		} catch (error) {
			this.logger.error('Google Analytics connection test failed', {
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	/**
	 * Track custom events via Measurement Protocol
	 *
	 * @param event - Track event data
	 * @param context - Event context including consent
	 */
	async track(event: TrackEvent, context: EventContext): Promise<void> {
		if (!this.settings?.enableServerSide) return;
		if (!context.consent.measurement) return;

		try {
			const ga4Event = this.mapTrackEvent(event, context);
			await this.sendToMeasurementProtocol(ga4Event);
		} catch (error) {
			this.logger.error('Failed to send track event to Google Analytics', {
				error: error instanceof Error ? error.message : String(error),
				event: event.name,
			});
		}
	}

	/**
	 * Track page views via Measurement Protocol
	 *
	 * @param event - Page event data
	 * @param context - Event context including consent
	 */
	async page(event: PageEvent, context: EventContext): Promise<void> {
		if (!this.settings?.enableServerSide) return;
		if (!context.consent.measurement) return;

		try {
			const ga4Event = this.mapPageEvent(event, context);
			await this.sendToMeasurementProtocol(ga4Event);
		} catch (error) {
			this.logger.error('Failed to send page event to Google Analytics', {
				error: error instanceof Error ? error.message : String(error),
				page: event.name,
			});
		}
	}

	/**
	 * Handle identify events via Measurement Protocol
	 *
	 * @param event - Identify event data
	 * @param context - Event context including consent
	 */
	async identify(event: IdentifyEvent, context: EventContext): Promise<void> {
		if (!this.settings?.enableServerSide) return;
		if (!context.consent.measurement) return;

		try {
			const ga4Event = this.mapIdentifyEvent(event, context);
			await this.sendToMeasurementProtocol(ga4Event);
		} catch (error) {
			this.logger.error('Failed to send identify event to Google Analytics', {
				error: error instanceof Error ? error.message : String(error),
				userId: event.userId,
			});
		}
	}

	/**
	 * Handle group events
	 *
	 * @param event - Group event data
	 * @param context - Event context
	 */
	async group(_event: GroupEvent, _context: EventContext): Promise<void> {
		// Google Analytics doesn't have group events
		this.logger.debug('Google Analytics group event received', {
			groupId: _event.groupId,
		});
	}

	/**
	 * Handle alias events
	 *
	 * @param event - Alias event data
	 * @param context - Event context
	 */
	async alias(_event: AliasEvent, _context: EventContext): Promise<void> {
		// Google Analytics doesn't have alias events
		this.logger.debug('Google Analytics alias event received', {
			previousId: _event.properties.previousId,
			userId: _event.properties.userId,
		});
	}

	/**
	 * Handle consent events
	 *
	 * @param event - Consent event data
	 * @param context - Event context
	 */
	async consent(_event: ConsentEvent, _context: EventContext): Promise<void> {
		// Google Analytics doesn't have consent events
		this.logger.debug('Google Analytics consent event received', {
			purposes: _event.properties.purposes,
		});
	}

	/**
	 * Generate client-side gtag.js scripts
	 *
	 * @param settings - Google Analytics settings
	 * @param consent - User consent preferences
	 * @returns Generated scripts or null if not applicable
	 */
	generateScript(
		settings: GoogleAnalyticsSettings,
		consent: AnalyticsConsent
	): UniversalScript[] | null {
		if (!settings.enableClientSide) return null;
		if (!consent.measurement) return null;

		return [
			{
				type: 'script',
				src: 'https://www.googletagmanager.com/gtag/js',
				async: true,
				requiredConsent: ['measurement'],
				strategy: 'eager',
				priority: 'high',
			},
			{
				type: 'inline',
				content: `
					window.dataLayer = window.dataLayer || [];
					function gtag(){dataLayer.push(arguments);}
					gtag('js', new Date());
					gtag('config', '${settings.measurementId}', {
						'anonymize_ip': ${settings.anonymizeIp},
						'cookie_flags': '${settings.cookieFlags}',
						'send_page_view': ${settings.enableEnhancedMeasurement},
						${settings.debugMode ? "'debug_mode': true," : ''}
						${settings.customParameters ? `'custom_map': ${JSON.stringify(settings.customParameters)},` : ''}
					});
					${settings.debugMode ? "gtag('event', 'debug_mode', { debug_mode: true });" : ''}
				`,
				requiredConsent: ['measurement'],
				strategy: 'eager',
				priority: 'normal',
			},
		];
	}

	/**
	 * Get script dependencies
	 *
	 * @returns Array of dependency names
	 */
	getScriptDependencies(): string[] {
		return ['Google Analytics Core'];
	}

	/**
	 * Validate script settings
	 *
	 * @param settings - Settings to validate
	 * @returns Promise resolving to true if valid
	 */
	async validateScriptSettings(
		settings: GoogleAnalyticsSettings
	): Promise<boolean> {
		try {
			GoogleAnalyticsSettingsSchema.parse(settings);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Handle errors from the destination
	 *
	 * @param error - Error that occurred
	 * @param event - Event that caused the error
	 */
	async onError(error: Error, event: unknown): Promise<void> {
		this.logger.error('Google Analytics destination error', {
			error: error.message,
			event,
		});
	}

	/**
	 * Destroy the destination instance
	 */
	async destroy(): Promise<void> {
		this.settings = null;
		this.logger.debug('Google Analytics destination destroyed');
	}

	// Private methods

	/**
	 * Send event to Google Analytics Measurement Protocol
	 *
	 * @internal
	 * @param event - Event data to send
	 */
	private async sendToMeasurementProtocol(
		event: Record<string, unknown>
	): Promise<void> {
		if (!this.settings) return;

		const response = await fetch(
			`https://www.google-analytics.com/mp/collect?measurement_id=${this.settings.measurementId}&api_secret=${this.settings.apiSecret}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(event),
			}
		);

		if (!response.ok) {
			const error = await response.text();
			throw new MeasurementProtocolError(
				`GA4 Measurement Protocol error: ${response.status} ${error}`,
				response.status
			);
		}

		this.logger.debug('Google Analytics event sent successfully', {
			eventName: (event.events as Array<{ name: string }>)?.[0]?.name,
		});
	}

	/**
	 * Map track event to GA4 format
	 *
	 * @internal
	 * @param event - Track event
	 * @param context - Event context
	 * @returns Mapped event data
	 */
	private mapTrackEvent(
		event: TrackEvent,
		context: EventContext
	): Record<string, unknown> {
		return {
			client_id: context.sessionId,
			user_id: context.userId,
			events: [
				{
					name: this.mapEventName(event.name),
					params: {
						...this.mapEventParameters(event.properties),
						...this.settings?.customParameters,
						timestamp_micros: new Date(event.timestamp).getTime() * 1000,
					},
				},
			],
		};
	}

	/**
	 * Map page event to GA4 format
	 *
	 * @internal
	 * @param event - Page event
	 * @param context - Event context
	 * @returns Mapped event data
	 */
	private mapPageEvent(
		event: PageEvent,
		context: EventContext
	): Record<string, unknown> {
		return {
			client_id: context.sessionId,
			user_id: context.userId,
			events: [
				{
					name: 'page_view',
					params: {
						page_title: event.name,
						page_location: event.properties.url || '',
						page_path:
							event.properties.url && typeof event.properties.url === 'string'
								? new URL(event.properties.url).pathname
								: '',
						...this.settings?.customParameters,
						timestamp_micros: new Date(event.timestamp).getTime() * 1000,
					},
				},
			],
		};
	}

	/**
	 * Map identify event to GA4 format
	 *
	 * @internal
	 * @param event - Identify event
	 * @param context - Event context
	 * @returns Mapped event data
	 */
	private mapIdentifyEvent(
		event: IdentifyEvent,
		context: EventContext
	): Record<string, unknown> {
		return {
			client_id: context.sessionId,
			user_id: event.userId,
			user_properties: this.mapUserProperties(event.traits),
			events: [
				{
					name: 'user_engagement',
					params: {
						engagement_time_msec: 1000,
						...this.settings?.customParameters,
						timestamp_micros: new Date(event.timestamp).getTime() * 1000,
					},
				},
			],
		};
	}

	/**
	 * Map analytics event names to GA4 event names
	 *
	 * @internal
	 * @param eventName - Analytics event name
	 * @returns GA4 event name
	 */
	private mapEventName(eventName: string): string {
		// Map common analytics events to GA4 events
		const eventMap: Record<string, string> = {
			'Product Viewed': 'view_item',
			'Product Added to Cart': 'add_to_cart',
			'Checkout Started': 'begin_checkout',
			Purchase: 'purchase',
			'Sign Up': 'sign_up',
			Login: 'login',
			Search: 'search',
			'Video Play': 'video_play',
			Download: 'file_download',
		};

		return eventMap[eventName] || eventName.toLowerCase().replace(/\s+/g, '_');
	}

	/**
	 * Map event properties to GA4 parameters
	 *
	 * @internal
	 * @param properties - Event properties
	 * @returns Mapped parameters
	 */
	private mapEventParameters(
		properties: Record<string, unknown>
	): Record<string, unknown> {
		const params: Record<string, unknown> = {};

		// Map common e-commerce properties
		if (properties.value) {
			params.value = properties.value;
			params.currency = properties.currency || 'USD';
		}

		if (properties.category) {
			params.item_category = properties.category;
		}

		if (properties.product_id) {
			params.item_id = properties.product_id;
		}

		if (properties.product_name) {
			params.item_name = properties.product_name;
		}

		if (properties.quantity) {
			params.quantity = properties.quantity;
		}

		// Map custom properties
		Object.entries(properties).forEach(([key, value]) => {
			if (
				![
					'value',
					'currency',
					'category',
					'product_id',
					'product_name',
					'quantity',
				].includes(key)
			) {
				params[key] = value;
			}
		});

		return params;
	}

	/**
	 * Map user properties for GA4
	 *
	 * @internal
	 * @param traits - User traits
	 * @returns Mapped user properties
	 */
	private mapUserProperties(
		traits: Record<string, unknown>
	): Record<string, { value: unknown }> {
		const userProperties: Record<string, { value: unknown }> = {};

		Object.entries(traits).forEach(([key, value]) => {
			// GA4 user properties have specific formatting requirements
			if (
				typeof value === 'string' ||
				typeof value === 'number' ||
				typeof value === 'boolean'
			) {
				userProperties[key] = { value };
			}
		});

		return userProperties;
	}
}
