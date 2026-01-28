/**
 * Consent contracts index.
 *
 * @remarks
 * v2.0: Old consent contracts (post, verify, identify) have been removed.
 * Use the subject contracts for consent management.
 * Only the check contract remains for cross-device consent checking.
 *
 * @packageDocumentation
 */

import { checkConsentContract } from './check.contract';

export const consentContracts = {
	check: checkConsentContract,
};

export * from './check.contract';
