/**
 * @packageDocumentation
 * c15t Analytics Engine
 *
 * Provides GDPR-compliant analytics tracking integrated with consent management.
 *
 * @example
 * ```typescript
 * import { createConsentManagerStore } from 'c15t';
 *
 * const store = createConsentManagerStore(manager, {
 *   analytics: {
 *     uploadUrl: '/api/analytics',
 *     debug: true
 *   }
 * });
 *
 * // Track events directly through the store
 * await store.getState().track({
 *   name: 'button_clicked',
 *   properties: { button: 'cta' }
 * });
 * ```
 */

export {
	canCollectForPurpose,
	canSendEvent,
	createAnalyticsConsent,
	filterEventsByConsent,
	getEventPurpose,
	isConsentRequired,
	isDoNotTrackEnabled,
} from './consent';
export {
	getBrowserLanguage,
	getCurrentPath,
	getCurrentUrl,
	getPageTitle,
	getScreenDimensions,
	getUserAgent,
	getViewportDimensions,
	isBrowser,
	isServer,
} from './globals';
export { EventQueue } from './queue';
export type {
	AliasAction,
	AnalyticsConfig,
	AnalyticsConsent,
	AnalyticsEvent,
	AnalyticsEventType,
	AnalyticsState,
	BaseEventProperties,
	CommonAction,
	CommonProperties,
	ConsentPurpose,
	EventOptions,
	GroupAction,
	GroupTraits,
	IdentifyAction,
	PageAction,
	PageEventProperties,
	QueueConfig,
	TrackAction,
	TrackEventProperties,
	Uploader,
	UploadRequest,
	UserTraits,
} from './types';
export {
	DEFAULT_ANALYTICS_CONFIG,
	DEFAULT_CONSENT,
	DEFAULT_QUEUE_CONFIG,
	EVENT_PURPOSE_MAP,
} from './types';
export {
	canSendAnalyticsEvent,
	createAnalyticsEvent,
	createAnalyticsMethods,
	initializeAnalyticsState,
	updateAnalyticsConsentFromGdpr,
} from './utils';
