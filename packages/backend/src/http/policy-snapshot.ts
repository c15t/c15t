/**
 * Signed policy decisions. The token binds a policy ID and canonical fingerprint
 * to the request context and tenant. Saves validate that fingerprint against the
 * current manifest before using its rule.
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

		const payload = {
			aud: resolveAudience(options, claims.tenantId),
			country: claims.country,
			exp,
			fingerprint: claims.fingerprint,
			iat,
			iss: resolveIssuer(options),
			jurisdiction: claims.jurisdiction,
			language: claims.language,
			matchedBy: claims.matchedBy,
			model: claims.model,
			policyId: claims.policyId,
			region: claims.region,
			sub: claims.policyId,
			tenantId: claims.tenantId,
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
