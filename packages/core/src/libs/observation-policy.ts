import { SAFE_FALLBACK_POLICY_FINGERPRINTS } from '@c15t/schema/types';
import type { PolicyResolution } from '@c15t/schema/types';

/** Fingerprint a displayed banner may claim; failed or unmatched resolution is unknown. @internal */
export const observationPolicyFingerprint =
	function observationPolicyFingerprint(
		resolution: PolicyResolution
	): string | undefined {
		if (resolution.status === 'matched') {
			return resolution.fingerprints.policy;
		}
		if (resolution.status === 'unconfigured') {
			return SAFE_FALLBACK_POLICY_FINGERPRINTS.policy;
		}
		return undefined;
	};
