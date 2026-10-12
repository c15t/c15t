/**
 * v3 policy resolution: matching a pack against a request's location.
 *
 * The outcome types, the versioned wire contract and the client reader live
 * in `policy-resolution-wire.ts` and are re-exported here. Resolving a pack
 * validates, normalizes and hashes authored rules, which only servers and
 * offline mode do.
 *
 * Resolution has four outcomes that never collapse into one `null`:
 *
 * - `unconfigured`: the producer had no policy system configured.
 * - `matched`: a configured rule matched.
 * - `no-match`: valid configuration, sufficient inputs, nothing matched.
 * - `failed`: invalid configuration, insufficient inputs, transport failure,
 *   or a wire the client cannot represent.
 *
 * `policy` is explicit on every outcome. `null` means "there is no policy"
 * and tells the kernel to clear policy-derived state. A missing wire is
 * never a substitute for any of these: `readPolicyResolutionWire` fails on
 * it. Old init and manifest wires are unsupported.
 *
 * Every non-matched outcome uses the safe opt-in choice fallback for runtime
 * behavior while the status stays observable. The fallback's fingerprints are
 * constants, so no consumer hashes anything on a construction, hydration or
 * render path.
 */

import { FAILED_CONFIGURATION } from './policy-resolution-wire';
import type { PolicyResolution } from './policy-resolution-wire';
import { inspectPolicyRules, normalizePolicyRule } from './policy-rule';
import type { PolicyRule } from './policy-rule';
import { createPolicyRuleFingerprints } from './policy-rule-fingerprint';
import type { PolicyMatch, PolicyMatchedBy } from './policy-runtime';

export {
	parsePolicyContractHeader,
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
	readPolicyResolutionWire,
	SAFE_FALLBACK_POLICY_FINGERPRINTS,
	SAFE_FALLBACK_POLICY_ID,
	safeFallbackPolicyInput,
	safeFallbackPolicyRule,
	writePolicyResolutionWire,
} from './policy-resolution-wire';
export type {
	PolicyResolution,
	PolicyResolutionFailed,
	PolicyResolutionFailure,
	PolicyResolutionMatched,
	PolicyResolutionNoMatch,
	PolicyResolutionUnconfigured,
	PolicyResolutionWire,
	SafeFallbackPolicyInput,
} from './policy-resolution-wire';

const normalizeCountryCode = function normalizeCountryCode(
	countryCode: string | null | undefined
): string | null {
	if (typeof countryCode !== 'string') {
		return null;
	}
	const normalized = countryCode.trim().toUpperCase();
	return normalized || null;
};

const normalizeRegionCode = function normalizeRegionCode(
	regionCode: string | null | undefined
): string | null {
	if (typeof regionCode !== 'string') {
		return null;
	}
	const normalized = (
		regionCode.includes('-') ? regionCode.split('-').pop() : regionCode
	)
		?.trim()
		.toUpperCase();
	return normalized || null;
};

/** Minimal entry the matcher needs. */
export interface PolicyMatchEntry {
	id: string;
	match: PolicyMatch;
}

/** Outcome of matching entries against a location. */
export type PolicyMatchOutcome =
	| { status: 'matched'; index: number; matchedBy: PolicyMatchedBy }
	| { status: 'no-match' }
	| { status: 'insufficient-inputs' };

const findRegionMatch = function findRegionMatch(
	entries: readonly PolicyMatchEntry[],
	countryCode: string,
	regionCode: string
): number {
	return entries.findIndex((entry) =>
		(entry.match.regions ?? []).some(
			(region) =>
				normalizeCountryCode(region.country) === countryCode &&
				normalizeRegionCode(region.region) === regionCode
		)
	);
};

const findCountryMatch = function findCountryMatch(
	entries: readonly PolicyMatchEntry[],
	countryCode: string
): number {
	return entries.findIndex((entry) =>
		(entry.match.countries ?? []).some(
			(country) => normalizeCountryCode(country) === countryCode
		)
	);
};

const matchMissingRegion = function matchMissingRegion(
	entries: readonly PolicyMatchEntry[],
	countryCode: string
): PolicyMatchOutcome | null {
	const regionFallbackIndex = entries.findIndex((entry) =>
		entry.match.regionFallbacks?.some(
			(country) => normalizeCountryCode(country) === countryCode
		)
	);
	if (regionFallbackIndex !== -1) {
		return {
			index: regionFallbackIndex,
			matchedBy: 'fallback',
			status: 'matched',
		};
	}
	const hasRegionRules = entries.some((entry) =>
		entry.match.regions?.some(
			(region) => normalizeCountryCode(region.country) === countryCode
		)
	);
	if (!hasRegionRules) {
		return null;
	}
	const index = entries.findIndex((entry) => entry.match.fallback === true);
	return index === -1
		? { status: 'insufficient-inputs' }
		: { index, matchedBy: 'fallback', status: 'matched' };
};

/**
 * Matches location inputs against ordered entries using the fixed precedence
 * region, country, country-specific missing-region fallback, global fallback
 * for unknown location, default. Without a country rule or region fallback,
 * a missing region is unknown when this country has configured region rules.
 *
 * @remarks
 * When the country is unknown and the pack has neither a fallback nor a
 * default, the inputs were insufficient to evaluate the country and region
 * matchers, which is a failure rather than a no-match. Entries are expected
 * to have passed {@link inspectPolicyRules}; malformed matchers are ignored.
 */
export const matchPolicyRules = function matchPolicyRules(params: {
	entries: readonly PolicyMatchEntry[];
	countryCode: string | null | undefined;
	regionCode: string | null | undefined;
}): PolicyMatchOutcome {
	const { entries } = params;
	const countryCode = normalizeCountryCode(params.countryCode);
	const regionCode = normalizeRegionCode(params.regionCode);

	if (countryCode && regionCode) {
		const index = findRegionMatch(entries, countryCode, regionCode);
		if (index !== -1) {
			return { index, matchedBy: 'region', status: 'matched' };
		}
	}
	if (countryCode) {
		const index = findCountryMatch(entries, countryCode);
		if (index !== -1) {
			return { index, matchedBy: 'country', status: 'matched' };
		}
		if (!regionCode) {
			const outcome = matchMissingRegion(entries, countryCode);
			if (outcome) {
				return outcome;
			}
		}
	}

	const fallbackIndex = entries.findIndex(
		(entry) => entry.match.fallback === true
	);
	const defaultIndex = entries.findIndex(
		(entry) => entry.match.isDefault === true
	);
	if (!countryCode && fallbackIndex !== -1) {
		return { index: fallbackIndex, matchedBy: 'fallback', status: 'matched' };
	}
	if (defaultIndex !== -1) {
		return { index: defaultIndex, matchedBy: 'default', status: 'matched' };
	}
	if (!countryCode) {
		return { status: 'insufficient-inputs' };
	}
	return { status: 'no-match' };
};

/**
 * Resolves a v3 policy pack for one request.
 *
 * @remarks
 * Synchronous. Validation failure, an unknown location without a fallback or
 * default, and no match all stay distinct. Fingerprints are computed once
 * here for the matched rule; nothing downstream needs to hash again.
 *
 * @param params - The pack (`undefined` means no policy system) and location.
 * @returns One of the four resolution outcomes. Never throws.
 * @example
 * ```ts
 * const resolution = resolvePolicyRules({
 *   rules: [policyRulePresets.europeOptIn(), policyRulePresets.worldOptOutNoPrompt()],
 *   countryCode: 'DE',
 *   regionCode: null,
 * });
 * if (resolution.status === 'matched') {
 *   resolution.fingerprints.choice;
 * }
 * ```
 */
export const resolvePolicyRules = function resolvePolicyRules(params: {
	rules?: unknown;
	countryCode: string | null;
	regionCode: string | null;
	iabEnabled?: boolean;
}): PolicyResolution {
	if (params.rules === undefined) {
		return { policy: null, status: 'unconfigured' };
	}
	const { errors } = inspectPolicyRules(
		params.rules,
		params.iabEnabled === undefined
			? undefined
			: { iabEnabled: params.iabEnabled }
	);
	if (errors.length > 0 || !Array.isArray(params.rules)) {
		return FAILED_CONFIGURATION;
	}
	const rules = params.rules as PolicyRule[];
	if (rules.length === 0) {
		return { policy: null, status: 'no-match' };
	}
	try {
		const outcome = matchPolicyRules({
			countryCode: params.countryCode,
			entries: rules,
			regionCode: params.regionCode,
		});
		if (outcome.status === 'insufficient-inputs') {
			return { policy: null, reason: 'insufficient-inputs', status: 'failed' };
		}
		if (outcome.status === 'no-match') {
			return { policy: null, status: 'no-match' };
		}
		const rule = rules[outcome.index];
		if (!rule) {
			return FAILED_CONFIGURATION;
		}
		const policy = normalizePolicyRule(rule);
		return {
			fingerprints: createPolicyRuleFingerprints(policy, rule.legacyMaterial),
			matchedBy: outcome.matchedBy,
			policy,
			policyId: policy.id,
			status: 'matched',
		};
	} catch {
		return FAILED_CONFIGURATION;
	}
};
