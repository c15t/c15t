/**
 * Maps a consent snapshot to the US section that applies to the visitor.
 *
 * The matched policy rule decides whether a US section applies and which
 * notices the string reports; the visitor's location only picks the section.
 *
 * @packageDocumentation
 */

import type { AllConsentNames, ConsentSnapshot } from '@c15t/core';

import type { USSectionValues } from './encoder';
import { US_NATIONAL_SECTION, US_STATE_SECTIONS } from './sections';
import type { USSectionDefinition } from './sections';

/**
 * How US visitors are signalled.
 *
 * - `state`: the visitor's state section (`usca`, `usva`, …). When the
 *   region is unknown or has no section c15t encodes, {@link GPPUSFallback}
 *   decides.
 * - `national`: the MSPA US National section (`usnat`) for every US
 *   visitor. The MSPA reserves it for signatories that chose the national
 *   approach.
 */
export type GPPUSApproach = 'state' | 'national';

/**
 * Under the state approach, what a US visitor gets when their region is
 * unknown or their state has no section c15t encodes.
 *
 * - `usnat`: the MSPA US National section carries the opt-outs, reported as
 *   a transaction the MSPA does not cover unless `mspaMode` is set.
 * - `none`: no section, for publishers that reserve `usnat` for the MSPA
 *   national approach.
 */
export type GPPUSFallback = 'usnat' | 'none';

/**
 * MSPA mode for covered transactions. Leave unset when the publisher has
 * not signed the IAB Multi-State Privacy Agreement.
 *
 * - `opt-out-option`: the publisher offers the opt-outs itself.
 * - `service-provider`: the publisher neither sells nor shares personal data
 *   nor uses it for targeted advertising; downstream parties act as its
 *   service providers.
 */
export type GPPMspaMode = 'opt-out-option' | 'service-provider';

/** Options that shape the US section. */
export interface USSectionOptions {
	approach: GPPUSApproach;
	mspaMode?: GPPMspaMode;
	optOutCategories: readonly AllConsentNames[];
}

/** Opt-out notices, given whenever a US section applies. */
const OPT_OUT_NOTICES = new Set([
	'SaleOptOutNotice',
	'SharingOptOutNotice',
	'TargetedAdvertisingOptOutNotice',
]);

/** Opt-outs that follow the visitor's choice. */
const OPT_OUTS = new Set([
	'SaleOptOut',
	'SharingOptOut',
	'TargetedAdvertisingOptOut',
]);

/** General notices about processing and sharing. */
const GENERAL_NOTICES = new Set(['SharingNotice', 'ProcessingNotice']);

/** `1` (yes) or `2` (no), the GPP encoding of a boolean that applies. */
const yesNo = (value: boolean): number => (value ? 1 : 2);

/**
 * The visitor's country and state. A developer override wins over the
 * backend's location. Region codes may arrive bare (`CA`) or prefixed
 * (`US-CA`).
 */
export const resolveUSState = function resolveUSState(
	snapshot: Pick<ConsentSnapshot, 'location' | 'overrides'>
): { country: string | null; region: string | null } {
	const country =
		snapshot.overrides.country ?? snapshot.location?.countryCode ?? null;
	const rawRegion =
		snapshot.overrides.region ?? snapshot.location?.regionCode ?? null;
	const upperCountry = country?.toUpperCase() ?? null;
	let region = rawRegion?.toUpperCase() ?? null;
	if (region && upperCountry && region.startsWith(`${upperCountry}-`)) {
		region = region.slice(upperCountry.length + 1);
	}
	return { country: upperCountry, region };
};

/** The parts of a snapshot a US section depends on. */
export type USSectionSnapshot = Pick<
	ConsentSnapshot,
	| 'effectivePermissions'
	| 'location'
	| 'overrides'
	| 'policyRule'
	| 'privacySignals'
>;

/**
 * Whether the matched policy rule calls for a US section: it gives the
 * visitor a way to opt out (the `preferences` or `opt-out` right) and is not
 * an `iab` rule, whose framework is TCF. Every `opt-in` and `opt-out` rule
 * offers an opt-out; a `none` rule does only when the host added the right.
 */
const callsForUSSection = (rule: USSectionSnapshot['policyRule']): boolean =>
	rule.model !== 'iab' &&
	(rule.rights.includes('preferences') || rule.rights.includes('opt-out'));

/**
 * The US section for a snapshot, or `null` when none applies.
 *
 * The policy decides first: an `iab` rule, or a rule that offers no
 * opt-out (a `none` rule without rights), gets no US section, wherever the
 * visitor is. Then the location picks the section. Under the state
 * approach, a US visitor whose region is unknown, or whose state has no
 * section c15t encodes, gets what `fallback` names.
 *
 * @param snapshot - Consent snapshot.
 * @param approach - State sections or the national section.
 * @param fallback - Section for an unresolved state. Default: `'usnat'`.
 * @returns The section definition, or `null` when none applies.
 */
export const resolveUSSectionDefinition = function resolveUSSectionDefinition(
	snapshot: Pick<USSectionSnapshot, 'location' | 'overrides' | 'policyRule'>,
	approach: GPPUSApproach,
	fallback: GPPUSFallback = 'usnat'
): USSectionDefinition | null {
	const { country, region } = resolveUSState(snapshot);
	if (country !== 'US' || !callsForUSSection(snapshot.policyRule)) {
		return null;
	}
	if (approach === 'national') {
		return US_NATIONAL_SECTION;
	}
	const state = region ? US_STATE_SECTIONS[region] : undefined;
	if (state) {
		return state;
	}
	return fallback === 'usnat' ? US_NATIONAL_SECTION : null;
};

/**
 * Field values for a US section.
 *
 * A sale, sharing or targeted advertising opt-out is reported when any of
 * `optOutCategories` is not permitted, so the signal matches what c15t
 * gates on the page: a refused category, a GPC signal the policy honours,
 * or an opt-in policy without a grant. The opt-out notices are reported as
 * given, since the section only applies under a rule that offers an
 * opt-out; the sharing or processing notice is given when the rule has the
 * `disclosure` right. Sensitive data and known-child consents are reported
 * as not applicable: c15t has no category for them.
 *
 * @param definition - The section to fill.
 * @param snapshot - Consent snapshot.
 * @param options - Opt-out categories and MSPA mode.
 * @returns Core values and the GPC flag.
 */
export const resolveUSSectionValues = function resolveUSSectionValues(
	definition: USSectionDefinition,
	snapshot: Pick<
		USSectionSnapshot,
		'effectivePermissions' | 'policyRule' | 'privacySignals'
	>,
	options: Pick<USSectionOptions, 'mspaMode' | 'optOutCategories'>
): USSectionValues {
	const disclosed = snapshot.policyRule.rights.includes('disclosure');
	const optedOut = options.optOutCategories.some(
		(category) => snapshot.effectivePermissions[category] !== true
	);
	const covered = options.mspaMode !== undefined;
	// In service provider mode nothing is sold, shared or used for targeted
	// advertising, so the opt-outs and their notices do not apply.
	const serviceProvider = options.mspaMode === 'service-provider';
	const core: USSectionValues['core'] = {};
	for (const [name, , count] of definition.core) {
		if (count !== undefined) {
			core[name] = Array.from({ length: count }, () => 0);
		} else if (name === 'Version') {
			core[name] = definition.version;
		} else if (GENERAL_NOTICES.has(name)) {
			core[name] = yesNo(disclosed);
		} else if (OPT_OUT_NOTICES.has(name)) {
			core[name] = serviceProvider ? 0 : 1;
		} else if (OPT_OUTS.has(name)) {
			core[name] = serviceProvider ? 0 : yesNo(optedOut);
		} else if (name === 'MspaCoveredTransaction') {
			core[name] = yesNo(covered);
		} else if (name === 'MspaOptOutOptionMode') {
			core[name] = covered ? yesNo(options.mspaMode === 'opt-out-option') : 0;
		} else if (name === 'MspaServiceProviderMode') {
			core[name] = covered ? yesNo(serviceProvider) : 0;
		} else {
			core[name] = 0;
		}
	}
	return { core, gpc: snapshot.privacySignals.gpc.active };
};
