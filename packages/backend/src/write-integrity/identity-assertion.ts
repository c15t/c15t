import { type JWTPayload, SignJWT } from 'jose';
import {
	assertNonEmpty,
	getSigningKey,
	isWriteIntegrityPayload,
	resolveTtlSeconds,
	verifyWriteIntegrityToken,
	type WriteIntegrityPayload,
	type WriteIntegrityVerificationResult,
} from './token';

const DEFAULT_ISSUER = 'c15t-app';
const DEFAULT_AUDIENCE = 'c15t-identity-assertion';
const DEFAULT_TTL_SECONDS = 300;
const IDENTITY_ASSERTION_TYPE = 'c15t-identity-assertion+jwt';

/**
 * An action that can be authorized by an identity assertion.
 */
export type IdentityAssertionAction = 'identity:link' | 'identity:reassign';

/**
 * Options used by an application server to sign an identity assertion.
 */
export interface CreateIdentityAssertionOptions {
	/** Shared secret used to sign the assertion with HS256. */
	signingKey: string;
	/** Token issuer. Defaults to `c15t-app`. */
	issuer?: string;
	/** Intended recipient. Defaults to `c15t-identity-assertion`. */
	audience?: string;
	/** Assertion lifetime in seconds. Defaults to 300 seconds. */
	ttlSeconds?: number;
}

/**
 * Options used by c15t to verify an identity assertion.
 */
export interface VerifyIdentityAssertionOptions {
	/** Shared secret used to verify the HS256 signature. */
	verificationKey: string;
	/** Expected token issuer. Defaults to `c15t-app`. */
	issuer?: string;
	/** Expected recipient. Defaults to `c15t-identity-assertion`. */
	audience?: string;
	/** Maximum assertion age in seconds. Defaults to 300 seconds. */
	maxAgeSeconds?: number;
}

/**
 * Claims carried by an app-server-signed identity assertion.
 */
export interface IdentityAssertionPayload extends WriteIntegrityPayload {
	action: IdentityAssertionAction;
	externalId: string;
	identityProvider: string;
}

/**
 * Result returned after verifying an identity assertion.
 */
export type IdentityAssertionVerificationResult =
	WriteIntegrityVerificationResult<IdentityAssertionPayload>;

/**
 * Creates an assertion that authorizes linking one exact external identity.
 *
 * The external ID and identity provider are signed without normalization.
 * Callers must verify against the exact values received in the write request.
 *
 * @param params - Signing options and claims to bind to the assertion
 * @returns The compact JWT and its signed claims
 * @throws {TypeError} When a required string is empty
 * @throws {RangeError} When `ttlSeconds` is not a positive integer
 */
export async function createIdentityAssertion(params: {
	options: CreateIdentityAssertionOptions;
	tenantId?: string;
	subjectId: string;
	action: IdentityAssertionAction;
	domain?: string;
	externalId: string;
	identityProvider: string;
}): Promise<{ token: string; payload: IdentityAssertionPayload }> {
	const issuer = params.options.issuer?.trim() || DEFAULT_ISSUER;
	const audience = params.options.audience?.trim() || DEFAULT_AUDIENCE;
	const ttlSeconds = resolveTtlSeconds(
		params.options.ttlSeconds,
		DEFAULT_TTL_SECONDS
	);

	assertNonEmpty(params.options.signingKey, 'signingKey');
	assertNonEmpty(params.subjectId, 'subjectId');
	assertNonEmpty(params.externalId, 'externalId');
	assertNonEmpty(params.identityProvider, 'identityProvider');
	if (params.tenantId !== undefined) {
		assertNonEmpty(params.tenantId, 'tenantId');
	}
	if (params.domain !== undefined) {
		assertNonEmpty(params.domain, 'domain');
	}

	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + ttlSeconds;
	const jti = crypto.randomUUID();
	const payload: IdentityAssertionPayload = {
		iss: issuer,
		aud: audience,
		sub: params.subjectId,
		tenantId: params.tenantId,
		action: params.action,
		domain: params.domain,
		externalId: params.externalId,
		identityProvider: params.identityProvider,
		iat,
		exp,
		jti,
	};
	const token = await new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256', typ: IDENTITY_ASSERTION_TYPE })
		.sign(getSigningKey(params.options.signingKey));

	return { token, payload };
}

/**
 * Verifies an identity assertion and all request-specific bindings.
 *
 * @param params - Token, verification options, and exact expected claims
 * @returns A discriminated result containing either verified claims or a
 * stable failure reason
 */
export function verifyIdentityAssertion(params: {
	token?: string;
	options: VerifyIdentityAssertionOptions;
	tenantId?: string;
	subjectId: string;
	action: IdentityAssertionAction;
	domain?: string;
	externalId: string;
	identityProvider: string;
}): Promise<IdentityAssertionVerificationResult> {
	return verifyWriteIntegrityToken({
		token: params.token,
		verificationKey: params.options.verificationKey,
		issuer: params.options.issuer?.trim() || DEFAULT_ISSUER,
		audience: params.options.audience?.trim() || DEFAULT_AUDIENCE,
		type: IDENTITY_ASSERTION_TYPE,
		maxAgeSeconds: params.options.maxAgeSeconds ?? DEFAULT_TTL_SECONDS,
		isPayload: isIdentityAssertionPayload,
		matchesExpectedClaims: (payload) =>
			payload.sub === params.subjectId &&
			payload.action === params.action &&
			(payload.tenantId ?? undefined) === (params.tenantId ?? undefined) &&
			(payload.domain ?? undefined) === (params.domain ?? undefined) &&
			payload.externalId === params.externalId &&
			payload.identityProvider === params.identityProvider,
	});
}

function isIdentityAssertionPayload(
	payload: JWTPayload
): payload is IdentityAssertionPayload {
	return (
		isWriteIntegrityPayload(payload) &&
		(payload.action === 'identity:link' ||
			payload.action === 'identity:reassign') &&
		typeof payload.externalId === 'string' &&
		payload.externalId.length > 0 &&
		typeof payload.identityProvider === 'string' &&
		payload.identityProvider.length > 0
	);
}
