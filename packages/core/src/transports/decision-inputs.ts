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

import type { KernelOverrides, SavePayload } from '../types';

export interface RememberedDecisionInputs {
	policyId?: string | null;
	fingerprint?: string;
	country: string | null;
	region: string | null;
	language: string;
	gpc?: boolean;
}

const primaryLanguage = function primaryLanguage(value: string): string {
	return value.toLowerCase().split('-')[0] ?? value.toLowerCase();
};

/**
 * Whether kernel overrides still describe the inputs a remembered decision
 * was made for. Any defined override that differs (country, region, GPC,
 * or the language's primary subtag) means the decision is stale for the
 * request that is about to run.
 *
 * @param inputs - The remembered decision inputs.
 * @param overrides - Overrides the next init or save will use.
 * @returns `true` when the decision still applies.
 */
export const decisionInputsMatchOverrides =
	function decisionInputsMatchOverrides(
		inputs: RememberedDecisionInputs,
		overrides: KernelOverrides | undefined
	): boolean {
		if (!overrides) {
			return true;
		}
		if (
			overrides.country !== undefined &&
			overrides.country !== inputs.country
		) {
			return false;
		}
		if (overrides.region !== undefined && overrides.region !== inputs.region) {
			return false;
		}
		if (overrides.gpc !== undefined && overrides.gpc !== inputs.gpc) {
			return false;
		}
		return (
			overrides.language === undefined ||
			primaryLanguage(overrides.language) === primaryLanguage(inputs.language)
		);
	};

/** Fields added to `POST /subjects` to bind the save to a policy decision. */
export type DecisionAssertion = Pick<
	RememberedDecisionInputs,
	'country' | 'fingerprint' | 'gpc' | 'language' | 'policyId' | 'region'
>;

export const rememberDecisionInputs = function rememberDecisionInputs(
	payload: InitOutput,
	gpc: boolean | undefined
): RememberedDecisionInputs {
	let policyId: string | null | undefined;
	if (payload.policyResolution?.status === 'matched') {
		({ policyId } = payload.policyResolution);
	} else if (payload.policyResolution?.status === 'no-match') {
		policyId = null;
	}
	return {
		country: payload.location.countryCode,
		fingerprint:
			payload.policyResolution?.status === 'matched'
				? payload.policyResolution.fingerprints.policy
				: undefined,
		gpc,
		language: payload.translations.language,
		policyId,
		region: payload.location.regionCode,
	};
};

/**
 * Decision fields to send with a save, or `undefined` when none apply.
 *
 * Only asserted when the payload carries no signed snapshot token and init
 * resolved a policy pack or explicitly found no match. Partial inputs (country/language without
 * policyId/fingerprint, e.g. a manifest with no packs configured) are
 * rejected by the backend as incomplete (`422 STALE_POLICY`).
 */
export const buildDecisionAssertion = function buildDecisionAssertion(
	payload: SavePayload,
	inputs: RememberedDecisionInputs | undefined
): DecisionAssertion | undefined {
	const decision: RememberedDecisionInputs | undefined =
		payload.decisionInputs ?? inputs;
	if (
		payload.policySnapshotToken ||
		!decision ||
		decision.policyId === undefined ||
		(decision.policyId !== null &&
			(!decision.policyId || !decision.fingerprint))
	) {
		return undefined;
	}
	return {
		country: decision.country,
		fingerprint: decision.fingerprint,
		gpc: decision.gpc,
		language: decision.language,
		policyId: decision.policyId,
		region: decision.region,
	};
};

/**
 * Parse the GPC request headers into the resolver's boolean input. The
 * application override `x-c15t-gpc` wins over the browser's `sec-gpc`.
 */
export const gpcFromHeaders = function gpcFromHeaders(
	headers: Record<string, string> | undefined
): boolean | undefined {
	const value = headers?.['x-c15t-gpc'] ?? headers?.['sec-gpc'];
	if (value === '1') {
		return true;
	}
	if (value === '0') {
		return false;
	}
	return undefined;
};
