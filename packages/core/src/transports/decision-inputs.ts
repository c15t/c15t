/**
 * Decision inputs remembered from the last successful init so a save can
 * assert which policy it was made against.
 *
 * Shared by the hosted and manifest transports. A backend that resolves
 * `/init` itself normally signs the decision into `policySnapshotToken`;
 * manifest resolution never issues a token, so these inputs are the only
 * evidence the backend has to reject a save made against a stale policy.
 */

import type { InitOutput } from '@c15t/schema/types';

import type { SavePayload } from '../types';

export interface RememberedDecisionInputs {
	policyId?: string;
	fingerprint?: string;
	country: string | null;
	region: string | null;
	language: string;
	gpc?: boolean;
}

/** Fields added to `POST /subjects` to bind the save to a policy decision. */
export type DecisionAssertion = Pick<
	RememberedDecisionInputs,
	'country' | 'fingerprint' | 'gpc' | 'language' | 'policyId' | 'region'
>;

export const rememberDecisionInputs = function rememberDecisionInputs(
	payload: InitOutput,
	gpc: boolean | undefined
): RememberedDecisionInputs {
	return {
		country: payload.location.countryCode,
		fingerprint:
			payload.policyResolution?.status === 'matched'
				? payload.policyResolution.fingerprints.policy
				: undefined,
		gpc,
		language: payload.translations.language,
		policyId:
			payload.policyResolution?.status === 'matched'
				? payload.policyResolution.policyId
				: undefined,
		region: payload.location.regionCode,
	};
};

/**
 * Decision fields to send with a save, or `undefined` when none apply.
 *
 * Only asserted when the payload carries no signed snapshot token and init
 * actually resolved a policy pack. Partial inputs (country/language without
 * policyId/fingerprint, e.g. a manifest with no packs configured) are
 * rejected by the backend as incomplete (`422 STALE_POLICY`).
 */
export const buildDecisionAssertion = function buildDecisionAssertion(
	payload: SavePayload,
	inputs: RememberedDecisionInputs | undefined
): DecisionAssertion | undefined {
	if (payload.policySnapshotToken || !inputs?.policyId || !inputs.fingerprint) {
		return undefined;
	}
	return {
		country: inputs.country,
		fingerprint: inputs.fingerprint,
		gpc: inputs.gpc,
		language: inputs.language,
		policyId: inputs.policyId,
		region: inputs.region,
	};
};

/** Parse the `sec-gpc` request header into the resolver's boolean input. */
export const gpcFromHeaders = function gpcFromHeaders(
	headers: Record<string, string> | undefined
): boolean | undefined {
	const value = headers?.['sec-gpc'];
	if (value === '1') {
		return true;
	}
	if (value === '0') {
		return false;
	}
	return undefined;
};
