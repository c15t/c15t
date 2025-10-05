/**
 * @fileoverview Meta Pixel universal destination implementation.
 *
 * Provides both server-side Conversions API integration and client-side
 * pixel script generation for Facebook/Meta advertising tracking with
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
 * Settings schema for Meta Pixel destination
 *
 * @public
 * Validates configuration for Meta Pixel integration including
 * pixel ID, access token, and feature toggles.
 */
export const MetaPixelSettingsSchema = z.object({
	pixelId: z.string().min(1, 'Pixel ID is required'),
	accessToken: z.string().min(1, 'Access token is required'),
	testEventCode: z.string().optional(),
	apiVersion: z.string().default('v18.0'),
	enableServerSide: z.boolean().default(true),
	enableClientSide: z.boolean().default(true),
	customData: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Meta Pixel settings type
 *
 * @public
 * TypeScript type for Meta Pixel configuration
 */
export type MetaPixelSettings = z.infer<typeof MetaPixelSettingsSchema>;

/**
 * Meta Pixel specific error types
 *
 * @public
 * Custom error classes for Meta Pixel operations
 */
export class MetaPixelError extends Error {
	constructor(
		message: string,
		public code: string,
		public statusCode?: number
	) {
		super(message);
		this.name = 'MetaPixelError';
	}
}

export class ConversionsAPIError extends MetaPixelError {
	constructor(message: string, statusCode: number) {
		super(message, 'CONVERSIONS_API_ERROR', statusCode);
	}
}

export class PixelScriptError extends MetaPixelError {
	constructor(message: string) {
		super(message, 'PIXEL_SCRIPT_ERROR');
	}
}

/**
 * Meta Pixel universal destination implementation
 *
 * @public
 * Implements both server-side Conversions API calls and client-side
 * pixel script generation for Facebook/Meta advertising tracking.
 */
export class MetaPixelDestination
	implements UniversalDestinationPlugin<MetaPixelSettings>
{
	readonly type = 'meta-pixel';
	readonly name = 'Meta Pixel';
	readonly description = 'Facebook Meta Pixel advertising tracking destination';
	readonly category = 'marketing' as const;
	readonly version = '1.0.0';
	readonly gdprCompliant = true;
	readonly settingsSchema =
		MetaPixelSettingsSchema as unknown as StandardSchemaV1<MetaPixelSettings>;
	readonly requiredConsent: ReadonlyArray<ConsentPurpose> = ['marketing'];

	private settings: MetaPixelSettings | null = null;
	private logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	/**
	 * Initialize the Meta Pixel destination with settings
	 *
	 * @param settings - Meta Pixel configuration
	 * @throws {ZodError} When settings validation fails
	 */
	async initialize(settings: MetaPixelSettings): Promise<void> {
		this.settings = MetaPixelSettingsSchema.parse(settings);
		this.logger.info('Meta Pixel destination initialized', {
			pixelId: this.settings.pixelId,
			enableServerSide: this.settings.enableServerSide,
			enableClientSide: this.settings.enableClientSide,
		});
	}

	/**
	 * Test connection to Meta Conversions API
	 *
	 * @returns Promise resolving to true if connection successful
	 */
	async testConnection(): Promise<boolean> {
		if (!this.settings) {
			throw new Error('Meta Pixel destination not initialized');
		}

		try {
			// Test Conversions API connection
			const testEvent = {
				data: [
					{
						event_name: 'PageView',
						event_time: Math.floor(Date.now() / 1000),
						user_data: {
							client_ip_address: '127.0.0.1',
							client_user_agent: 'test-agent',
						},
						custom_data: {
							test: true,
						},
					},
				],
				test_event_code: this.settings.testEventCode,
			};

			const response = await fetch(
				`https://graph.facebook.com/${this.settings.apiVersion}/${this.settings.pixelId}/events`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${this.settings.accessToken}`,
					},
					body: JSON.stringify(testEvent),
				}
			);

			return response.ok;
		} catch (error) {
			this.logger.error('Meta Pixel connection test failed', {
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	/**
	 * Track custom events via Conversions API
	 *
	 * @param event - Track event data
	 * @param context - Event context including consent
	 */
	async track(event: TrackEvent, context: EventContext): Promise<void> {
		if (!this.settings?.enableServerSide) return;
		if (!context.consent.marketing) return;

		try {
			const pixelEvent = this.mapTrackEvent(event, context);
			await this.sendToConversionsAPI(pixelEvent);
		} catch (error) {
			this.logger.error('Failed to send track event to Meta Pixel', {
				error: error instanceof Error ? error.message : String(error),
				event: event.name,
			});
		}
	}

	/**
	 * Track page views via Conversions API
	 *
	 * @param event - Page event data
	 * @param context - Event context including consent
	 */
	async page(event: PageEvent, context: EventContext): Promise<void> {
		if (!this.settings?.enableServerSide) return;
		if (!context.consent.marketing) return;

		try {
			const pixelEvent = this.mapPageEvent(event, context);
			await this.sendToConversionsAPI(pixelEvent);
		} catch (error) {
			this.logger.error('Failed to send page event to Meta Pixel', {
				error: error instanceof Error ? error.message : String(error),
				page: event.name,
			});
		}
	}

	/**
	 * Handle identify events (Meta Pixel doesn't have direct identify)
	 *
	 * @param event - Identify event data
	 * @param context - Event context
	 */
	async identify(event: IdentifyEvent, context: EventContext): Promise<void> {
		// Meta Pixel doesn't have a direct identify event
		// Store user data for future events
		this.logger.debug('Meta Pixel identify event received', {
			userId: event.userId,
		});
	}

	/**
	 * Handle group events
	 *
	 * @param event - Group event data
	 * @param context - Event context
	 */
	async group(_event: GroupEvent, _context: EventContext): Promise<void> {
		// Meta Pixel doesn't have group events
		this.logger.debug('Meta Pixel group event received', {
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
		// Meta Pixel doesn't have alias events
		this.logger.debug('Meta Pixel alias event received', {
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
		// Meta Pixel doesn't have consent events
		this.logger.debug('Meta Pixel consent event received', {
			purposes: _event.properties.purposes,
		});
	}

	/**
	 * Generate client-side pixel script
	 *
	 * @param settings - Meta Pixel settings
	 * @param consent - User consent preferences
	 * @returns Generated script or null if not applicable
	 */
	generateScript(
		settings: MetaPixelSettings,
		consent: AnalyticsConsent
	): UniversalScript | null {
		if (!settings.enableClientSide) return null;
		if (!consent.marketing) return null;

		return {
			type: 'inline',
			content: `
				!function(f,b,e,v,n,t,s)
				{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
				n.callMethod.apply(n,arguments):n.queue.push(arguments)};
				if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
				n.queue=[];t=b.createElement(e);t.async=!0;
				t.src=v;s=b.getElementsByTagName(e)[0];
				s.parentNode.insertBefore(t,s)}(window, document,'script',
				'https://connect.facebook.net/en_US/fbevents.js');
				fbq('init', '${settings.pixelId}');
				fbq('track', 'PageView');
				${settings.testEventCode ? `fbq('track', 'PageView', {}, {test_event_code: '${settings.testEventCode}'});` : ''}
			`,
			requiredConsent: ['marketing'],
			strategy: 'eager',
			priority: 'high',
		};
	}

	/**
	 * Get script dependencies
	 *
	 * @returns Array of dependency names
	 */
	getScriptDependencies(): string[] {
		return [];
	}

	/**
	 * Validate script settings
	 *
	 * @param settings - Settings to validate
	 * @returns Promise resolving to true if valid
	 */
	async validateScriptSettings(settings: MetaPixelSettings): Promise<boolean> {
		try {
			MetaPixelSettingsSchema.parse(settings);
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
	async onError(error: Error, _event: unknown): Promise<void> {
		this.logger.error('Meta Pixel destination error', {
			error: error.message,
			event: _event,
		});
	}

	/**
	 * Destroy the destination instance
	 */
	async destroy(): Promise<void> {
		this.settings = null;
		this.logger.debug('Meta Pixel destination destroyed');
	}

	// Private methods

	/**
	 * Send event to Meta Conversions API
	 *
	 * @internal
	 * @param event - Event data to send
	 */
	private async sendToConversionsAPI(
		event: Record<string, unknown>
	): Promise<void> {
		if (!this.settings) return;

		const payload = {
			data: [event],
			test_event_code: this.settings.testEventCode,
		};

		const response = await fetch(
			`https://graph.facebook.com/${this.settings.apiVersion}/${this.settings.pixelId}/events`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.settings.accessToken}`,
				},
				body: JSON.stringify(payload),
			}
		);

		if (!response.ok) {
			const error = await response.text();
			throw new ConversionsAPIError(
				`Meta Conversions API error: ${response.status} ${error}`,
				response.status
			);
		}

		const result = await response.json();
		this.logger.debug('Meta Pixel event sent successfully', {
			eventId: result.events_received,
		});
	}

	/**
	 * Map track event to Meta Pixel format
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
			event_name: this.mapEventName(event.name),
			event_time: Math.floor(new Date(event.timestamp).getTime() / 1000),
			user_data: this.buildUserData(context),
			custom_data: {
				...event.properties,
				...this.settings?.customData,
			},
			event_source_url: context.custom?.url || '',
			action_source: 'website',
		};
	}

	/**
	 * Map page event to Meta Pixel format
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
			event_name: 'PageView',
			event_time: Math.floor(new Date(event.timestamp).getTime() / 1000),
			user_data: this.buildUserData(context),
			custom_data: {
				page_name: event.name,
				page_url: event.properties.url || '',
				...this.settings?.customData,
			},
			event_source_url: event.properties.url || '',
			action_source: 'website',
		};
	}

	/**
	 * Map analytics event names to Meta Pixel event names
	 *
	 * @internal
	 * @param eventName - Analytics event name
	 * @returns Meta Pixel event name
	 */
	private mapEventName(eventName: string): string {
		// Map common analytics events to Meta Pixel events
		const eventMap: Record<string, string> = {
			'Product Viewed': 'ViewContent',
			'Product Added': 'AddToCart',
			'Checkout Started': 'InitiateCheckout',
			Purchase: 'Purchase',
			'Sign Up': 'CompleteRegistration',
			Login: 'Login',
		};

		return eventMap[eventName] || 'CustomEvent';
	}

	/**
	 * Build user data for Meta Pixel events
	 *
	 * @internal
	 * @param context - Event context
	 * @returns User data object
	 */
	private buildUserData(context: EventContext): Record<string, unknown> {
		const userData: Record<string, unknown> = {};

		if (context.userId) {
			userData.external_id = context.userId;
		}

		if (context.userAgent) {
			userData.client_user_agent = context.userAgent;
		}

		if (context.ip) {
			userData.client_ip_address = context.ip;
		}

		return userData;
	}
}
