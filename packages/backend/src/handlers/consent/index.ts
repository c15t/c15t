/**
 * Consent handlers index.
 *
 * @remarks
 * v2.0: Old consent handlers (post, verify, identify) have been removed.
 * Use the subject handlers for consent management.
 * Only the check handler remains for cross-device consent checking.
 *
 * @packageDocumentation
 */

export { checkConsentHandler } from './check.handler';
