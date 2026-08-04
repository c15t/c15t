/**
 * Signed evidence that a subject was shown a specific legal document.
 *
 * The sibling of `policy-snapshot.ts`, and deliberately built the same way:
 * same header, same issuer resolution, same tenant-scoped audience, same
 * refusal to mint an unsigned token. Where a policy snapshot attests to the
 * *decision* a visitor was shown, this attests to the **version and content
 * hash** of the terms they accepted.
 *
 * That distinction is the point. A consent record says someone agreed; it does
 * not, on its own, say what they agreed *to*. A verified snapshot pins the
 * document version and hash at the moment of acceptance, which is what turns
 * the record into something defensible when the terms later change.
 *
 * Ported from `@c15t/backend`'s `handlers/legal-document/snapshot.ts` with the
 * verification result reshaped to match `SnapshotVerification` here, so a
 * caller handles both kinds of snapshot identically.
 */

import { jwtVerify, SignJWT } from 'jose';
import type { SnapshotVerification } from './policy-snapshot';

const JWT_HEADER = { alg: 'HS256', typ: 'JWT' } as const;
const DEFAULT_ISSUER = 'c15t';
const DEFAULT_AUDIENCE = 'c15t-legal-document-snapshot';
/**
 * A day, against the policy snapshot's half hour.
 *
 * A policy snapshot backs a single decision and is consumed immediately. This
 * one is held by a client between being shown the terms and submitting
 * acceptance, which can legitimately span a long session.
 */
const DEFAULT_TTL_SECONDS = 86_400;

export interface LegalDocumentSnapshotOptions {
	readonly signingKey?: string;
	readonly issuer?: string;
	readonly audience?: string;
	readonly ttlSeconds?: number;
}

export interface LegalDocumentSnapshotClaims {
	/** e.g. `terms_and_conditions`, `privacy_policy`. */
	readonly type: string;
	readonly version: string;
	/** Content hash — what makes this attest to the text, not just a label. */
	readonly hash: string;
	readonly effectiveDate: string;
	readonly tenantId?: string;
}

function resolveIssuer(options: LegalDocumentSnapshotOptions): string {
	return options.issuer?.trim() || DEFAULT_ISSUER;
}

/**
 * Audience is tenant-scoped when a tenant is known.
 *
 * Without it a token minted for one tenant would verify against another, which
 * for signed evidence is a confused-deputy problem rather than a convenience.
 */
function resolveAudience(
	options: LegalDocumentSnapshotOptions,
	tenantId: string | undefined
): string {
	const configured = options.audience?.trim();
	if (configured) {
		return configured;
	}
	return tenantId ? `${DEFAULT_AUDIENCE}:${tenantId}` : DEFAULT_AUDIENCE;
}

const signingKey = (secret: string): Uint8Array =>
	new TextEncoder().encode(secret);

/**
 * Mints a token, or returns undefined when signing is not configured.
 *
 * No signing key means no token rather than an unsigned one: evidence that
 * cannot be verified is worse than absent evidence, because a caller may treat
 * its presence as meaningful.
 */
export async function createLegalDocumentSnapshotToken(
	claims: LegalDocumentSnapshotClaims,
	options: LegalDocumentSnapshotOptions | undefined
): Promise<{ token: string; payload: Record<string, unknown> } | undefined> {
	if (!options?.signingKey) {
		return undefined;
	}

	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + (options.ttlSeconds ?? DEFAULT_TTL_SECONDS);

	const payload = {
		iss: resolveIssuer(options),
		aud: resolveAudience(options, claims.tenantId),
		// The document identity is the subject of the claim.
		sub: `${claims.type}:${claims.version}`,
		tenantId: claims.tenantId,
		type: claims.type,
		version: claims.version,
		hash: claims.hash,
		effectiveDate: claims.effectiveDate,
		iat,
		exp,
	};

	const token = await new SignJWT(payload)
		.setProtectedHeader(JWT_HEADER)
		.setIssuedAt(iat)
		.setExpirationTime(exp)
		.sign(signingKey(options.signingKey));

	return { token, payload };
}

/**
 * Verifies a token against the configured key, issuer and tenant audience.
 *
 * Any failure collapses to `invalid` rather than reporting why. Distinguishing
 * "wrong signature" from "wrong audience" from "expired" tells an attacker
 * which part of a forged token to fix next.
 */
export async function verifyLegalDocumentSnapshotToken(
	token: string | undefined,
	options: LegalDocumentSnapshotOptions | undefined,
	tenantId: string | undefined
): Promise<SnapshotVerification> {
	if (!options?.signingKey || !token) {
		return { valid: false, reason: 'missing' };
	}

	try {
		const { payload } = await jwtVerify(token, signingKey(options.signingKey), {
			issuer: resolveIssuer(options),
			audience: resolveAudience(options, tenantId),
		});
		return { valid: true, payload: payload as Record<string, unknown> };
	} catch {
		return { valid: false, reason: 'invalid' };
	}
}
