import type { AllConsentNames, ConsentState } from '../types';

/**
 * Checks if the user has given consent for a specific type.
 *
 * @param consentType - The type of consent to check.
 * @param consents - The current state of user consents.
 * @returns True if consent is given, false otherwise.
 */
export function hasConsentFor(
	consentType: AllConsentNames,
	consents: ConsentState
): boolean {
	return consents[consentType] || false;
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
