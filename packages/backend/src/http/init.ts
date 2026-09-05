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
	parsePolicyContractHeader,
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
	resolveInitFromManifest,
	writePolicyResolutionWire,
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
	/**
	 * The policy contract the client declared it can represent, or
	 * `undefined` for a client that predates the header. `null` when the
	 * header was present but unparseable.
	 */
	readonly policyContract: number | null | undefined;
}

const readPolicyContract = function readPolicyContract(
	value: string | null
): number | null | undefined {
	if (value === null) {
		return undefined;
	}
	return parsePolicyContractHeader(value) ?? null;
};

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
		gpc: headers.get('sec-gpc') === '1',

		// Matches 2.x: the raw header, defaulted to 'en'. Narrowing to a
		// primary subtag happens downstream in the resolver, not here.
		language: headers.get('accept-language') || 'en',
		policyContract: readPolicyContract(headers.get(POLICY_CONTRACT_HEADER)),
		region: region ?? null,
	};
};

/** Negotiation cannot revoke grants already running in cached original clients. */
const isContractSupported = function isContractSupported(
	declared: number | null | undefined
): boolean {
	return declared === undefined || declared === POLICY_CONTRACT_VERSION;
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
	gvl?: GvlOptions & { enabled?: boolean },
	/**
	 * Tenant the token audience is scoped to. The instance's tenant when it
	 * has one, so the save route verifying under `options.tenantId` and the
	 * init route minting agree; the manifest's tenant otherwise.
	 */
	tokenTenantId: string | undefined = config.tenantId
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

	const supported = isContractSupported(signals.policyContract);
	const negotiated: InitOutput = supported
		? resolved
		: {
				branding: resolved.branding,
				jurisdiction: resolved.jurisdiction,
				location: resolved.location,
				policyResolution: writePolicyResolutionWire({
					policy: null,
					reason: 'unsupported-contract',
					status: 'failed',
				}),
				translations: resolved.translations,
			};
	const resolution = negotiated.policyResolution;
	const wantsGvl =
		gvl?.enabled === true &&
		resolution.status === 'matched' &&
		resolution.policy.model === 'iab';
	const gvlDocument = wantsGvl
		? await resolveGvl(signals.language, gvl)
		: undefined;
	const body =
		gvlDocument === undefined
			? negotiated
			: { ...negotiated, gvl: gvlDocument };
	if (resolution.status !== 'matched' || !snapshot?.signingKey) {
		return { body, signals };
	}
	const token = await createPolicySnapshotToken(
		{
			country: signals.country,
			fingerprint: resolution.fingerprints.policy,
			jurisdiction: resolved.jurisdiction,
			language: signals.language,
			matchedBy: resolution.matchedBy,
			model: resolution.policy.model,
			policyId: resolution.policyId,
			region: signals.region,
			tenantId: tokenTenantId,
		},
		snapshot
	);
	return {
		body: token ? { ...body, policySnapshotToken: token.token } : body,
		signals,
	};
};
