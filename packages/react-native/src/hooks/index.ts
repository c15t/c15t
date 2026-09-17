/**
 * The headless read and write surface for React Native consent.
 *
 * Everything here reads the native snapshot or forwards an action. Nothing in
 * this folder renders anything, and nothing in it holds consent state.
 */

export { useC15tBootstrap } from './use-c15t-bootstrap';
export { useConsent } from './use-consent';
export { useConsentActions } from './use-consent-actions';
export { useConsentDecision } from './use-consent-decision';
export type { ConsentActions } from './use-consent-actions';
export { useConsentSelector } from './use-consent-selector';
export { useConsentStatus } from './use-consent-status';
export { useConsentSafeArea } from './use-consent-safe-area';
export type { ConsentSafeArea } from './use-consent-safe-area';
export { useIsAllowed } from './use-is-allowed';
