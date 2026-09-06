/**
 * `GET /init` — the per-request consent decision.
 *
 * Every piece of this is shared with `@c15t/backend` rather than
 * reimplemented: the manifest comes from `buildConsentManifestFromConfig`, geo
 * from `getRegionFromHeaders`, and the decision itself from
 * `resolveInitFromManifest`. This module contributes header parsing and
 * nothing else.
 *
 * That is the whole point of RFC 0001's design. `/init` is the one endpoint on
 * the critical rendering path, and it is also the one whose output a host can
 * compute locally from the manifest. If a backend resolved it differently from
 * the shared resolver, hosts doing local resolution would disagree with the
 * server for the same visitor — which on a consent platform means showing the
 * wrong banner, or none. Keeping exactly one resolver makes that class of bug
 * unreachable rather than merely tested for.
 *
 * Like `/manifest`, this touches no database.
 */

import { getRegionFromHeaders, headersToRecord } from '@c15t/schema/geo';
import {
	buildConsentManifestFromConfig,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import type { ConsentManifestConfig, InitOutput } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import { resolveGvl } from './gvl';
import type { GvlOptions } from './gvl';
import { createPolicySnapshotToken } from './policy-snapshot';
import type { PolicySnapshotOptions } from './policy-snapshot';

export interface InitRequestSignals {
	readonly country: string | null;
	readonly region: string | null;
	readonly language: string;
	readonly gpc: boolean;
}

/**
 * Extracts the four per-request inputs from headers.
 *
 * These are the only request-dependent values in an `/init` response —
 * everything else comes from the manifest, which is why the manifest can be
 * cached per tenant and this cannot.
 */
export const readInitSignals = function readInitSignals(
	headers: Headers
): InitRequestSignals {
	const { country, region } = getRegionFromHeaders(headersToRecord(headers));

	return {
		country: country ?? null,
		// Global Privacy Control is a signal, not a preference: the spec
		// defines '1' as the only affirmative value, so anything else is
		// absence rather than a false.
		gpc: (headers.get('x-c15t-gpc') ?? headers.get('sec-gpc')) === '1',

		// Matches 2.x: the raw header, defaulted to 'en'. Narrowing to a
		// primary subtag happens downstream in the resolver, not here.
		language: headers.get('accept-language') || 'en',
		region: region ?? null,
	};
};

/**
 * Resolves an `/init` response for one request.
 *
 * Geo-dependent by definition, so unlike `/manifest` it must not be cached
 * across visitors.
 */
export const buildInitResponse = async function buildInitResponse(
	config: ConsentManifestConfig,
	headers: Headers,
	snapshot?: PolicySnapshotOptions,
	gvl?: GvlOptions & { enabled?: boolean }
): Promise<{ body: InitOutput; signals: InitRequestSignals }> {
	const signals = readInitSignals(headers);
	const manifest = await buildConsentManifestFromConfig(config);

	const resolved = resolveInitFromManifest(
		manifest,
		{
			country: signals.country,
			gpc: signals.gpc,
			language: signals.language,
			region: signals.region,
		},
		{ baseTranslations }
	);

	// Signed evidence of the decision just made, so the consent submitted
	// against it can be checked to be the one this server actually issued.
	// Absent when no signing key is configured — `policySnapshotToken` is
	// optional in the contract precisely because signing is opt-in.
	// policyDecision carries the *why* — which policy matched and how — while
	// `policy` carries the resolved content. The token attests to the former.
	// IAB deployments get the vendor list inline. Matching @c15t/backend, this
	// is fetched only when IAB is enabled *and* the resolved policy is an IAB
	// one — a non-IAB visitor on an IAB-enabled tenant should not pay for it.
	const wantsGvl =
		gvl?.enabled === true &&
		(resolved.policy === undefined || resolved.policy.model === 'iab');
	const gvlDocument = wantsGvl
		? await resolveGvl(signals.language, gvl)
		: undefined;

	const withGvl =
		gvlDocument === undefined ? resolved : { ...resolved, gvl: gvlDocument };

	const decision = resolved.policyDecision;
	if (!decision || !snapshot?.signingKey) {
		return { body: withGvl, signals };
	}

	const token = await createPolicySnapshotToken(
		{
			country: signals.country,
			fingerprint: decision.fingerprint,
			jurisdiction: resolved.jurisdiction,
			language: signals.language,
			matchedBy: decision.matchedBy,
			model: resolved.policy?.model ?? 'none',
			policyId: decision.policyId,
			region: signals.region,
			tenantId: config.tenantId,
		},
		snapshot
	);

	return {
		body: token ? { ...withGvl, policySnapshotToken: token.token } : withGvl,
		signals,
	};
};
