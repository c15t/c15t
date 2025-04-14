import type { AllConsentNames, ConsentState } from '../types';

/**
 * Determines the effective consents based on the user's Do Not Track setting.
 *
 * @param consents - The current state of user consents.
 * @param honorDoNotTrack - Whether to respect the user's Do Not Track setting.
 * @returns The effective consents after considering Do Not Track.
 */
export function getEffectiveConsents(
	consents: ConsentState,
	honorDoNotTrack: boolean
): ConsentState {
	if (
		honorDoNotTrack &&
		typeof window !== 'undefined' &&
		window.navigator.doNotTrack === '1'
	) {
		return Object.keys(consents).reduce((acc, key) => {
			if (key in consents) {
				acc[key as AllConsentNames] = key === 'necessary';
			}
			return acc;
		}, {} as ConsentState);
	}
	return consents;
}

/**
 * Checks if the user has given consent for a specific type.
 *
 * @param consentType - The type of consent to check.
 * @param consents - The current state of user consents.
 * @param honorDoNotTrack - Whether to respect the user's Do Not Track setting.
 * @returns True if consent is given, false otherwise.
 */
export function hasConsentFor(
	consentType: AllConsentNames,
	consents: ConsentState,
	honorDoNotTrack: boolean
): boolean {
	const effectiveConsents = getEffectiveConsents(consents, honorDoNotTrack);
	return effectiveConsents[consentType] || false;
}

/**
 * Determines if the user has consented based on consent information.
 *
 * @param consentInfo - The consent information.
 * @returns True if the user has consented, false otherwise.
 */
export function hasConsented(
	consentInfo: { time: number; type: 'all' | 'custom' | 'necessary' } | null
): boolean {
	return consentInfo !== null;
}
