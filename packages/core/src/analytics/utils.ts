/**
 * @packageDocumentation
 * Analytics utilities integrated with c15t store.
 * Provides analytics functionality that works with the existing consent management system.
 */

import type { AllConsentNames } from '../types/gdpr';
import { canSendEvent, createAnalyticsConsent } from './consent';
import {
	getBrowserLanguage,
	getCurrentPath,
	getCurrentUrl,
	getPageTitle,
	getUserAgent,
} from './globals';
import type { EventQueue } from './queue';
import type {
	AliasAction,
	AnalyticsConsent,
	AnalyticsEvent,
	AnalyticsEventType,
	AnalyticsState,
	BaseEventProperties,
	CommonAction,
	EventOptions,
	GroupAction,
	GroupTraits,
	IdentifyAction,
	PageAction,
	PageEventProperties,
	TrackAction,
	TrackEventProperties,
	UserTraits,
} from './types';

/**
 * Generate a unique ID for analytics.
 *
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 */
function generateId(prefix: string): string {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize analytics state for the store.
 *
 * @returns Initial analytics state
 */
export function initializeAnalyticsState(): AnalyticsState {
	return {
		anonymousId: generateId('anon'),
		userId: undefined,
		userTraits: {},
		groupId: undefined,
		groupTraits: {},
		commonProperties: {},
		consent: {
			necessary: true,
			measurement: false,
			marketing: false,
			functionality: false,
			experience: false,
		},
		sessionId: generateId('session'),
		windowId: generateId('window'),
		loaded: true,
	};
}

/**
 * Update analytics consent from GDPR consent state.
 *
 * @param gdprConsents - GDPR consent state
 * @returns Analytics consent state
 */
export function updateAnalyticsConsentFromGdpr(
	gdprConsents: Record<AllConsentNames, boolean>
): AnalyticsConsent {
	return createAnalyticsConsent(gdprConsents);
}

/**
 * Create an analytics event from action data with strict typing.
 *
 * @typeParam EventType - The type of analytics event
 * @param type - Event type
 * @param name - Event name (for track events)
 * @param analyticsState - Current analytics state
 * @param properties - Event properties
 * @param options - Event options
 * @returns Analytics event
 */
export function createAnalyticsEvent<EventType extends AnalyticsEventType>(
	type: EventType,
	name: EventType extends 'track' ? string : undefined,
	analyticsState: AnalyticsState,
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
						: BaseEventProperties,
	options: EventOptions = {}
): AnalyticsEvent<EventType> {
	const timestamp = options.timestamp
		? options.timestamp instanceof Date
			? options.timestamp.toISOString()
			: options.timestamp
		: new Date().toISOString();

	const currentPath = getCurrentPath();
	const currentUrl = getCurrentUrl();
	const pageTitle = getPageTitle();
	const userAgent = getUserAgent();
	const language = getBrowserLanguage();

	return {
		type,
		name: name as EventType extends 'track' ? string : never,
		properties: {
			...analyticsState.commonProperties,
			...properties,
		} as EventType extends 'track'
			? TrackEventProperties
			: EventType extends 'page'
				? PageEventProperties
				: EventType extends 'identify'
					? UserTraits
					: EventType extends 'group'
						? GroupTraits
						: EventType extends 'alias'
							? BaseEventProperties
							: BaseEventProperties,
		userId: options.userId || analyticsState.userId,
		anonymousId: options.anonymousId || analyticsState.anonymousId,
		sessionId: analyticsState.sessionId,
		consent: analyticsState.consent,
		timestamp,
		messageId: generateId('msg'),
		context: {
			page: currentPath
				? {
						path: currentPath,
						title: pageTitle || '',
						url: currentUrl || '',
					}
				: undefined,
			userAgent,
			locale: language,
		},
	};
}

/**
 * Check if an event can be sent based on consent.
 *
 * @param event - Analytics event
 * @returns True if event can be sent
 */
export function canSendAnalyticsEvent(event: AnalyticsEvent): boolean {
	return canSendEvent(event, event.consent);
}

/**
 * Create analytics methods for the store.
 *
 * @param analyticsState - Current analytics state
 * @param updateAnalyticsState - Function to update analytics state
 * @param eventQueue - Event queue instance
 * @returns Analytics methods
 */
export function createAnalyticsMethods(
	analyticsState: AnalyticsState,
	updateAnalyticsState: (updates: Partial<AnalyticsState>) => void,
	eventQueue: EventQueue,
	analyticsConfigWithDefaults: { debug: boolean }
) {
	const logDebug = (message: string, data?: unknown) => {
		if (analyticsConfigWithDefaults.debug) {
			console.log(`[Analytics] ${message}`, data);
		}
	};

	return {
		async track(action: TrackAction): Promise<void> {
			const event = createAnalyticsEvent(
				'track',
				action.name,
				analyticsState,
				action.properties || {},
				action.options
			);

			// Always queue the event - let the queue handle consent filtering
			const context = {
				sessionId: analyticsState.sessionId,
				userId: analyticsState.userId,
				userAgent: getUserAgent() || 'unknown',
				ip: undefined,
				referrer: getCurrentUrl(),
				custom: {},
			};

			await eventQueue.queueEvent(event, context);
			logDebug('Event queued', {
				name: action.name,
				properties: action.properties,
			});
		},

		async page(action: PageAction): Promise<void> {
			const event = createAnalyticsEvent(
				'page',
				undefined,
				analyticsState,
				action.properties || {},
				action.options
			);

			// Always queue the event - let the queue handle consent filtering
			const context = {
				sessionId: analyticsState.sessionId,
				userId: analyticsState.userId,
				userAgent: getUserAgent() || 'unknown',
				ip: undefined,
				referrer: getCurrentUrl(),
				custom: {},
			};

			await eventQueue.queueEvent(event, context);
			logDebug('Page event queued', {
				name: action.name,
				properties: action.properties,
			});
		},

		async identify(action: IdentifyAction): Promise<void> {
			const event = createAnalyticsEvent(
				'identify',
				undefined,
				analyticsState,
				action.traits || {},
				action.options
			);

			// Update state with user ID and traits
			if (action.userId) {
				updateAnalyticsState({ userId: action.userId });
			}
			if (action.traits) {
				updateAnalyticsState({
					userTraits: { ...analyticsState.userTraits, ...action.traits },
				});
			}

			// Always queue the event - let the queue handle consent filtering
			const context = {
				sessionId: analyticsState.sessionId,
				userId: analyticsState.userId,
				userAgent: getUserAgent() || 'unknown',
				ip: undefined,
				referrer: getCurrentUrl(),
				custom: {},
			};

			await eventQueue.queueEvent(event, context);
			logDebug('Identify event queued', {
				userId: action.userId,
				traits: action.traits,
			});
		},

		async group(action: GroupAction): Promise<void> {
			const event = createAnalyticsEvent(
				'group',
				undefined,
				analyticsState,
				action.traits || {},
				action.options
			);

			// Update state with group ID and traits
			updateAnalyticsState({ groupId: action.groupId });
			if (action.traits) {
				updateAnalyticsState({
					groupTraits: { ...analyticsState.groupTraits, ...action.traits },
				});
			}

			// Always queue the event - let the queue handle consent filtering
			const context = {
				sessionId: analyticsState.sessionId,
				userId: analyticsState.userId,
				userAgent: getUserAgent() || 'unknown',
				ip: undefined,
				referrer: getCurrentUrl(),
				custom: {},
			};

			await eventQueue.queueEvent(event, context);
			logDebug('Group event queued', {
				groupId: action.groupId,
				traits: action.traits,
			});
		},

		async alias(action: AliasAction): Promise<void> {
			const event = createAnalyticsEvent(
				'alias',
				undefined,
				analyticsState,
				{},
				action.options
			);

			// Update state with new user ID
			updateAnalyticsState({ userId: action.to });

			// Always queue the event - let the queue handle consent filtering
			const context = {
				sessionId: analyticsState.sessionId,
				userId: analyticsState.userId,
				userAgent: getUserAgent() || 'unknown',
				ip: undefined,
				referrer: getCurrentUrl(),
				custom: {},
			};

			await eventQueue.queueEvent(event, context);
			logDebug('Alias event queued', { from: action.from, to: action.to });
		},

		common(action: CommonAction): void {
			updateAnalyticsState({
				commonProperties: {
					...analyticsState.commonProperties,
					...action.properties,
				},
			});
			logDebug('Common properties updated', action.properties);
		},

		resetAnalytics(): void {
			updateAnalyticsState({
				userId: undefined,
				userTraits: {},
				groupId: undefined,
				groupTraits: {},
				commonProperties: {},
			});
			logDebug('Analytics reset');
		},

		async flushAnalytics(): Promise<void> {
			await eventQueue.flush();
		},

		async updateQueueConsent(consent: AnalyticsConsent): Promise<void> {
			await eventQueue.updateConsent(consent);
		},

		getQueueStats() {
			return eventQueue.getQueueStats();
		},
	};
}
