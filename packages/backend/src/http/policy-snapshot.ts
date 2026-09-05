/**
 * Policy snapshot tokens.
 *
 * A snapshot is signed evidence of the policy decision behind a consent: which
 * policy matched, under which jurisdiction, with which UI. A client presents it
 * back when submitting consent so the server can verify the decision it is
 * recording is one it actually made.
 *
 * ## Why this is reimplemented rather than shared
 *
 * Every other piece of logic both backends need has moved into `@c15t/schema`.
 * This one cannot: signing needs `jose`, and `@c15t/schema` is imported by
 * `packages/core` and `packages/react`, so putting a JWT library there would
 * land it in browser bundles. Issue #944 states the principle directly —
 * *"share dependency-light contracts or logic internally rather than merging
 * backend code into the frontend artifact"* — and keeps `@c15t/backend`
 * separate precisely because it has a different dependency tree and security
 * surface.
 *
 * The cost of duplicating is real: two signing implementations can diverge, and
 * a divergence means tokens one backend issues the other rejects. That is why
 * `policy-snapshot.test.ts` decodes tokens from both implementations and
 * compares their claims rather than merely checking this one is self-consistent.
 *
 * Every constant below is part of the wire format and must match
 * `@c15t/backend`'s `handlers/policy/snapshot.ts` exactly.
 */

import { jwtVerify, SignJWT } from 'jose';

const JWT_HEADER = { alg: 'HS256', typ: 'JWT' } as const;
const DEFAULT_ISSUER = 'c15t';
const DEFAULT_AUDIENCE = 'c15t-policy-snapshot';
const DEFAULT_TTL_SECONDS = 1800;

export interface PolicySnapshotOptions {
	readonly signingKey?: string;
	readonly issuer?: string;
	readonly audience?: string;
	readonly ttlSeconds?: number;
}

export interface PolicySnapshotClaims {
	readonly policyId: string;
	readonly fingerprint: string;
	readonly matchedBy: string;
	readonly country: string | null;
	readonly region: string | null;
	readonly jurisdiction: string;
	readonly model: string;
	readonly tenantId?: string;
	readonly language?: string;
	readonly policyI18n?: unknown;
	readonly expiryDays?: number;
	readonly scopeMode?: string;
	readonly uiMode?: string;
	readonly bannerUi?: unknown;
	readonly dialogUi?: unknown;
	readonly categories?: readonly string[];
	readonly preselectedCategories?: readonly string[];
	readonly gpc?: boolean;
	readonly proofConfig?: unknown;
	/**
	 * v3 exact-policy fingerprint (`policyResolution.fingerprints.policy`).
	 * Additive: `fingerprint` stays the legacy hash the decision row stores.
	 */
	readonly policyFingerprint?: string;
}

const resolveIssuer = function resolveIssuer(
	options: PolicySnapshotOptions
): string {
	return options.issuer?.trim() || DEFAULT_ISSUER;
};

/**
 * Audience is tenant-scoped when a tenant is known.
 *
 * That is what stops a token minted for one tenant verifying against another —
 * without it a snapshot would be portable across tenants, which for signed
 * evidence is a confused-deputy problem rather than a convenience.
 */
const resolveAudience = function resolveAudience(
	options: PolicySnapshotOptions,
	tenantId: string | undefined
): string {
	const configured = options.audience?.trim();
	if (configured) {
		return configured;
	}
	return tenantId ? `${DEFAULT_AUDIENCE}:${tenantId}` : DEFAULT_AUDIENCE;
};

const signingKey = (secret: string): Uint8Array =>
	new TextEncoder().encode(secret);

/**
 * Mints a snapshot token, or returns undefined when signing is not configured.
 *
 * No signing key means no token rather than an unsigned one: evidence that
 * cannot be verified is worse than absent evidence, because a caller may treat
 * its presence as meaningful.
 */
export const createPolicySnapshotToken =
	async function createPolicySnapshotToken(
		claims: PolicySnapshotClaims,
		options: PolicySnapshotOptions | undefined
	): Promise<{ token: string; payload: Record<string, unknown> } | undefined> {
		if (!options?.signingKey) {
			return undefined;
		}

		const iat = Math.floor(Date.now() / 1000);
		const exp = iat + (options.ttlSeconds ?? DEFAULT_TTL_SECONDS);

		// Claim order matches @c15t/backend's payload construction. It does not
		// affect verification, but keeping it identical makes the two payloads
		// diffable when the parity test fails.
		const payload = {
			aud: resolveAudience(options, claims.tenantId),
			bannerUi: claims.bannerUi,
			categories: claims.categories,
			country: claims.country,
			dialogUi: claims.dialogUi,
			exp,
			expiryDays: claims.expiryDays,
			fingerprint: claims.fingerprint,
			gpc: claims.gpc,
			iat,
			iss: resolveIssuer(options),
			jurisdiction: claims.jurisdiction,
			language: claims.language,
			matchedBy: claims.matchedBy,
			model: claims.model,
			policyFingerprint: claims.policyFingerprint,
			policyI18n: claims.policyI18n,
			policyId: claims.policyId,
			preselectedCategories: claims.preselectedCategories,
			proofConfig: claims.proofConfig,
			region: claims.region,
			scopeMode: claims.scopeMode,
			sub: claims.policyId,
			tenantId: claims.tenantId,
			uiMode: claims.uiMode,
		};

		const token = await new SignJWT(payload)
			.setProtectedHeader(JWT_HEADER)
			.setIssuedAt(iat)
			.setExpirationTime(exp)
			.sign(signingKey(options.signingKey));

		return { payload, token };
	};

export type SnapshotVerification =
	| { readonly valid: true; readonly payload: Record<string, unknown> }
	| { readonly valid: false; readonly reason: 'missing' | 'invalid' };

/**
 * Verifies a token against the configured key, issuer and tenant audience.
 *
 * Any failure collapses to `invalid` rather than reporting why. Distinguishing
 * "wrong signature" from "wrong audience" from "expired" tells an attacker
 * which part of a forged token to fix next.
 */
export const verifyPolicySnapshotToken =
	async function verifyPolicySnapshotToken(
		token: string | undefined,
		options: PolicySnapshotOptions | undefined,
		tenantId: string | undefined
	): Promise<SnapshotVerification> {
		if (!options?.signingKey || !token) {
			return { reason: 'missing', valid: false };
		}

		try {
			const { payload } = await jwtVerify(
				token,
				signingKey(options.signingKey),
				{
					audience: resolveAudience(options, tenantId),
					issuer: resolveIssuer(options),
				}
			);
			return { payload: payload as Record<string, unknown>, valid: true };
		} catch {
			return { reason: 'invalid', valid: false };
		}
	};
