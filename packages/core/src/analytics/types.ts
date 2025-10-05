/**
 * @packageDocumentation
 * Core types for the c15t analytics engine.
 * Provides type-safe interfaces for event tracking, consent gating, and analytics configuration.
 */

/**
 * Consent purposes for analytics events.
 * Maps to GDPR consent categories for granular control.
 */
export type ConsentPurpose =
	| 'necessary'
	| 'measurement'
	| 'marketing'
	| 'functionality'
	| 'experience';

/**
 * Granular consent state for analytics events.
 * Each purpose can be independently controlled.
 */
export interface AnalyticsConsent {
	/** Always true - necessary events are always allowed */
	necessary: boolean;
	/** Analytics and measurement events */
	measurement: boolean;
	/** Marketing and advertising events */
	marketing: boolean;
	/** Functional features and preferences */
	functionality: boolean;
	/** User experience improvements */
	experience: boolean;
	/** When consent was given */
	dateConsented?: string;
}

/**
 * Event type discriminator for analytics events.
 */
export type AnalyticsEventType =
	| 'track'
	| 'page'
	| 'identify'
	| 'group'
	| 'alias';

/**
 * Base properties that can be included in analytics events.
 */
export interface BaseEventProperties {
	[key: string]:
		| string
		| number
		| boolean
		| null
		| undefined
		| Date
		| BaseEventProperties
		| BaseEventProperties[];
}

/**
 * Strictly typed properties for track events.
 * Extends base properties with common tracking properties.
 */
export interface TrackEventProperties extends BaseEventProperties {
	/** Event category */
	category?: string;
	/** Event label */
	label?: string;
	/** Event value */
	value?: number;
	/** Custom properties */
	[key: string]:
		| string
		| number
		| boolean
		| null
		| undefined
		| Date
		| BaseEventProperties
		| BaseEventProperties[];
}

/**
 * Strictly typed properties for page events.
 */
export interface PageEventProperties extends BaseEventProperties {
	/** Page path */
	path?: string;
	/** Page title */
	title?: string;
	/** Page URL */
	url?: string;
	/** Referrer */
	referrer?: string;
	/** Custom properties */
	[key: string]:
		| string
		| number
		| boolean
		| null
		| undefined
		| Date
		| BaseEventProperties
		| BaseEventProperties[];
}

/**
 * Strictly typed user traits.
 */
export interface UserTraits extends BaseEventProperties {
	/** User email */
	email?: string;
	/** User name */
	name?: string;
	/** User phone */
	phone?: string;
	/** User avatar */
	avatar?: string;
	/** User plan */
	plan?: string;
	/** Custom traits */
	[key: string]:
		| string
		| number
		| boolean
		| null
		| undefined
		| Date
		| BaseEventProperties
		| BaseEventProperties[];
}

/**
 * Strictly typed group traits.
 */
export interface GroupTraits extends BaseEventProperties {
	/** Group name */
	name?: string;
	/** Group plan */
	plan?: string;
	/** Group size */
	size?: number;
	/** Custom traits */
	[key: string]:
		| string
		| number
		| boolean
		| null
		| undefined
		| Date
		| BaseEventProperties
		| BaseEventProperties[];
}

/**
 * Common properties applied to all events.
 */
export interface CommonProperties extends BaseEventProperties {
	/** App version */
	app_version?: string;
	/** Environment */
	environment?: string;
	/** Custom properties */
	[key: string]:
		| string
		| number
		| boolean
		| null
		| undefined
		| Date
		| BaseEventProperties
		| BaseEventProperties[];
}

/**
 * Event options for analytics tracking.
 */
export interface EventOptions {
	/** User ID override */
	userId?: string;
	/** Anonymous ID override */
	anonymousId?: string;
	/** Timestamp override */
	timestamp?: Date | string;
	/** Custom options */
	[key: string]:
		| string
		| number
		| boolean
		| null
		| undefined
		| Date
		| BaseEventProperties
		| BaseEventProperties[];
}

/**
 * Core analytics event structure with strict typing.
 * Simplified from Segment to be c15t-native.
 */
export interface AnalyticsEvent<
	EventType extends AnalyticsEventType = AnalyticsEventType,
> {
	/** Event type */
	type: EventType;
	/** Event name (for track events) */
	name?: EventType extends 'track' ? string : never;
	/** Event properties - typed based on event type */
	properties: EventType extends 'track'
		? TrackEventProperties
		: EventType extends 'page'
			? PageEventProperties
			: EventType extends 'identify'
				? UserTraits
				: EventType extends 'group'
					? GroupTraits
					: EventType extends 'alias'
						? BaseEventProperties
						: BaseEventProperties;

	/** User identification */
	userId?: string;
	/** Anonymous user ID */
	anonymousId: string;
	/** Session ID */
	sessionId: string;

	/** Consent context - determines if event can be sent */
	consent: AnalyticsConsent;

	/** Event metadata */
	timestamp: string;
	messageId: string;

	/** Context information */
	context: {
		page?: {
			path: string;
			title: string;
			url: string;
		};
		userAgent?: string;
		ip?: string;
		locale?: string;
		timezone?: string;
	};
}

/**
 * Upload request for sending events to server.
 */
export interface UploadRequest {
	/** Array of events to send */
	events: AnalyticsEvent[];
	/** When the request was sent */
	sentAt: string;
	/** Version of the analytics client */
	version: string;
}

/**
 * Configuration for analytics functionality.
 */
export interface AnalyticsConfig {
	/** Upload endpoint URL */
	uploadUrl: string;
	/** Debug mode */
	debug?: boolean;
	/** Event debounce interval in milliseconds */
	debounceInterval?: number;
	/** Whether to enable offline queuing */
	offlineQueue?: boolean;
	/** Whether to enable retry logic */
	retryEnabled?: boolean;
	/** Maximum retry attempts */
	maxRetries?: number;
}

/**
 * Uploader interface for abstracting network requests.
 */
export interface Uploader {
	/**
	 * Send events to the server.
	 *
	 * @param request - The upload request containing events
	 * @returns Promise that resolves when upload is complete
	 * @throws {Error} When upload fails
	 */
	send(request: UploadRequest): Promise<void>;
}

/**
 * Event action types for analytics tracking with strict typing.
 */
export interface TrackAction<
	PropertiesType extends TrackEventProperties = TrackEventProperties,
> {
	name: string;
	properties?: PropertiesType;
	options?: EventOptions;
}

export interface PageAction<
	PropertiesType extends PageEventProperties = PageEventProperties,
> {
	name?: string;
	properties?: PropertiesType;
	options?: EventOptions;
}

export interface IdentifyAction<TraitsType extends UserTraits = UserTraits> {
	userId?: string;
	traits?: TraitsType;
	options?: EventOptions;
}

export interface GroupAction<TraitsType extends GroupTraits = GroupTraits> {
	groupId: string;
	traits?: TraitsType;
	options?: EventOptions;
}

export interface AliasAction {
	to: string;
	from?: string;
	options?: EventOptions;
}

export interface CommonAction<
	PropertiesType extends CommonProperties = CommonProperties,
> {
	properties: PropertiesType;
}

/**
 * Analytics state integrated into the main store with strict typing.
 */
export interface AnalyticsState {
	/** Anonymous user ID */
	anonymousId: string;
	/** User ID */
	userId?: string;
	/** User traits */
	userTraits: UserTraits;
	/** Group ID */
	groupId?: string;
	/** Group traits */
	groupTraits: GroupTraits;
	/** Common properties applied to all events */
	commonProperties: CommonProperties;
	/** Current consent state */
	consent: AnalyticsConsent;
	/** Session ID */
	sessionId: string;
	/** Window ID */
	windowId: string;
	/** Whether analytics is loaded */
	loaded: boolean;
}

/**
 * Purpose mapping for different event types.
 * Determines which consent purpose is required for each event type.
 */
export const EVENT_PURPOSE_MAP: Record<AnalyticsEventType, ConsentPurpose> = {
	track: 'measurement',
	page: 'measurement',
	identify: 'measurement',
	group: 'measurement',
	alias: 'measurement',
};

/**
 * Default consent state (all false except necessary).
 */
export const DEFAULT_CONSENT: AnalyticsConsent = {
	necessary: true,
	measurement: false,
	marketing: false,
	functionality: false,
	experience: false,
};

/**
 * Configuration for event queue.
 */
export interface QueueConfig {
	/** Maximum number of events to batch together */
	maxBatchSize?: number;
	/** Debounce interval in milliseconds */
	debounceInterval?: number;
	/** Whether to enable deduplication */
	enableDeduplication?: boolean;
	/** Whether to enable offline queuing */
	enableOfflineQueue?: boolean;
	/** Maximum number of events to store offline */
	maxOfflineEvents?: number;
}

/**
 * Default queue configuration.
 */
export const DEFAULT_QUEUE_CONFIG: Required<QueueConfig> = {
	maxBatchSize: 50,
	debounceInterval: 300,
	enableDeduplication: true,
	enableOfflineQueue: true,
	maxOfflineEvents: 1000,
};

/**
 * Default analytics configuration.
 */
export const DEFAULT_ANALYTICS_CONFIG: Required<AnalyticsConfig> = {
	uploadUrl: '/api/detective',
	debug: false,
	debounceInterval: 300,
	offlineQueue: true,
	retryEnabled: true,
	maxRetries: 3,
};
