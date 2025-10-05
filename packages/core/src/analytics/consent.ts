/**
 * @packageDocumentation
 * Consent utilities for analytics events.
 * Provides consent checking and purpose mapping for GDPR compliance.
 */

import type { AllConsentNames } from '../types/gdpr';
import type { AnalyticsConsent, AnalyticsEvent, ConsentPurpose } from './types';

/**
 * Consent purpose to GDPR consent name mapping.
 */
export const CONSENT_PURPOSE_MAP: Record<ConsentPurpose, AllConsentNames> = {
	necessary: 'necessary',
	measurement: 'measurement',
	marketing: 'marketing',
	functionality: 'functionality',
	experience: 'experience',
};

/**
 * Check if data collection is allowed for a specific purpose.
 *
 * @param consent - Current consent state
 * @param purpose - The purpose to check
 * @returns True if data collection is allowed for this purpose
 *
 * @example
 * ```typescript
 * const canTrack = canCollectForPurpose(consent, 'measurement');
 * if (canTrack) {
 *   track('page_viewed', { page: '/home' });
 * }
 * ```
 */
export function canCollectForPurpose(
	consent: AnalyticsConsent,
	purpose: ConsentPurpose
): boolean {
	// Necessary events are always allowed
	if (purpose === 'necessary') {
		return true;
	}

	// Check if user has consented to this specific purpose
	return consent[purpose] === true;
}

/**
 * Check if an event can be sent based on its type and consent state.
 *
 * @param event - The analytics event to check
 * @param consent - Current consent state
 * @returns True if the event can be sent
 *
 * @example
 * ```typescript
 * const canSend = canSendEvent(event, consent);
 * if (canSend) {
 *   uploader.send({ events: [event], sentAt: new Date().toISOString(), version: '1.0.0' });
 * }
 * ```
 */
export function canSendEvent(
	event: AnalyticsEvent,
	consent: AnalyticsConsent
): boolean {
	// Determine the purpose required for this event type
	const purpose = getEventPurpose(event.type);

	// Check if consent is granted for this purpose
	return canCollectForPurpose(consent, purpose);
}

/**
 * Get the consent purpose required for an event type.
 *
 * @param eventType - The type of analytics event
 * @returns The consent purpose required
 *
 * @example
 * ```typescript
 * const purpose = getEventPurpose('track'); // 'measurement'
 * const purpose = getEventPurpose('page'); // 'measurement'
 * ```
 */
export function getEventPurpose(
	eventType: AnalyticsEvent['type']
): ConsentPurpose {
	// Most analytics events require measurement consent
	// This can be customized based on event names or properties
	switch (eventType) {
		case 'track':
		case 'page':
		case 'identify':
		case 'group':
		case 'alias':
			return 'measurement';
		default:
			return 'measurement';
	}
}

/**
 * Filter events based on consent state.
 * Removes events that cannot be sent due to lack of consent.
 *
 * @param events - Array of events to filter
 * @param consent - Current consent state
 * @returns Array of events that can be sent
 *
 * @example
 * ```typescript
 * const sendableEvents = filterEventsByConsent(events, consent);
 * if (sendableEvents.length > 0) {
 *   await uploader.send({ events: sendableEvents, sentAt: new Date().toISOString(), version: '1.0.0' });
 * }
 * ```
 */
export function filterEventsByConsent(
	events: AnalyticsEvent[],
	consent: AnalyticsConsent
): AnalyticsEvent[] {
	return events.filter((event) => canSendEvent(event, consent));
}

/**
 * Create consent state from GDPR consent names.
 *
 * @param gdprConsents - GDPR consent state
 * @returns Analytics consent state
 *
 * @example
 * ```typescript
 * const analyticsConsent = createAnalyticsConsent({
 *   necessary: true,
 *   measurement: true,
 *   marketing: false,
 *   functionality: false,
 *   experience: false
 * });
 * ```
 */
export function createAnalyticsConsent(
	gdprConsents: Record<AllConsentNames, boolean>
): AnalyticsConsent {
	return {
		necessary: gdprConsents.necessary ?? true,
		measurement: gdprConsents.measurement ?? false,
		marketing: gdprConsents.marketing ?? false,
		functionality: gdprConsents.functionality ?? false,
		experience: gdprConsents.experience ?? false,
		dateConsented: new Date().toISOString(),
	};
}

/**
 * Check if Do Not Track is enabled.
 *
 * @returns True if DNT is enabled
 *
 * @example
 * ```typescript
 * if (isDoNotTrackEnabled()) {
 *   // Respect user's DNT preference
 *   return false;
 * }
 * ```
 */
export function isDoNotTrackEnabled(): boolean {
	if (typeof navigator === 'undefined') {
		return false;
	}

	const dnt = navigator.doNotTrack;
	return dnt === '1' || dnt === 'yes';
}

/**
 * Check if consent is required based on DNT and other factors.
 *
 * @param respectDnt - Whether to respect Do Not Track
 * @returns True if consent is required
 *
 * @example
 * ```typescript
 * const consentRequired = isConsentRequired(true);
 * if (consentRequired) {
 *   // Show consent banner
 * }
 * ```
 */
export function isConsentRequired(respectDnt = true): boolean {
	// If DNT is enabled and we respect it, consent is required
	if (respectDnt && isDoNotTrackEnabled()) {
		return true;
	}

	// For now, always require consent for analytics
	// This can be customized based on jurisdiction detection
	return true;
}
