/**
 * Read the lifecycle flags a consent shell gates on.
 */

import { isConsentStatusEqual, selectConsentStatus } from '../lib/selectors';
import type { ConsentStatus } from '../lib/selectors';
import { useConsentSelector } from './use-consent-selector';

/**
 * The lifecycle slice of the snapshot: readiness, pending policy, active
 * surface, and outstanding prompt.
 *
 * Use it to decide whether to render anything at all. The value is compared
 * field by field, so a snapshot event that leaves these four alone does not
 * rerender the shell.
 *
 * @returns The four fields a gate needs before it trusts a permission.
 */
export const useConsentStatus = function useConsentStatus(): ConsentStatus {
	return useConsentSelector(selectConsentStatus, isConsentStatusEqual);
};
