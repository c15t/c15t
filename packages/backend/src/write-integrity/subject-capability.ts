import { type JWTPayload, SignJWT } from 'jose';
import {
	assertNonEmpty,
	getSigningKey,
	isWriteIntegrityPayload,
	resolveTtlSeconds,
	verifyWriteIntegrityToken,
	type WriteIntegrityAction,
	type WriteIntegrityPayload,
	type WriteIntegrityVerificationResult,
} from './token';

const DEFAULT_ISSUER = 'c15t';
const DEFAULT_AUDIENCE = 'c15t-subject-capability';
const DEFAULT_TTL_SECONDS = 300;
const SUBJECT_CAPABILITY_TYPE = 'c15t-subject-capability+jwt';

/**
 * Options used to sign a subject capability.
 */
export interface CreateSubjectCapabilityOptions {
	/** Shared secret used to sign the capability with HS256. */
	signingKey: string;
	/** Token issuer. Defaults to `c15t`. */
	issuer?: string;
	/** Intended recipient. Defaults to `c15t-subject-capability`. */
	audience?: string;
	/** Capability lifetime in seconds. Defaults to 300 seconds. */
	ttlSeconds?: number;
}

/**
 * Options used to verify a subject capability.
 */
export interface VerifySubjectCapabilityOptions {
	/** Secret used to issue capabilities and, by default, verify them. */
	signingKey: string;
	/** Optional separate secret used to verify the HS256 signature. */
	verificationKey?: string;
	/** Expected token issuer. Defaults to `c15t`. */
	issuer?: string;
	/** Expected recipient. Defaults to `c15t-subject-capability`. */
	audience?: string;
}

/**
 * Claims carried by a short-lived, subject-scoped write capability.
 */
export interface SubjectCapabilityPayload extends WriteIntegrityPayload {}

/**
 * Result returned after verifying a subject capability.
 */
export type SubjectCapabilityVerificationResult =
	WriteIntegrityVerificationResult<SubjectCapabilityPayload>;

/**
 * Creates a short-lived capability for one subject write.
 *
 * The optional tenant and domain are exact bindings: a verifier expecting an
 * omitted value will reject a token that contains one, and vice versa.
 *
 * @param params - Signing options and claims to bind to the capability
 * @returns The compact JWT and its signed claims
 * @throws {TypeError} When a required string is empty
 * @throws {RangeError} When `ttlSeconds` is not a positive integer
 */
export async function createSubjectCapability(params: {
	options: CreateSubjectCapabilityOptions;
	tenantId?: string;
	subjectId: string;
	action: WriteIntegrityAction;
	domain?: string;
}): Promise<{ token: string; payload: SubjectCapabilityPayload }> {
	const issuer = params.options.issuer?.trim() || DEFAULT_ISSUER;
	const audience = params.options.audience?.trim() || DEFAULT_AUDIENCE;
	const ttlSeconds = resolveTtlSeconds(
		params.options.ttlSeconds,
		DEFAULT_TTL_SECONDS
	);

	assertNonEmpty(params.options.signingKey, 'signingKey');
	assertNonEmpty(params.subjectId, 'subjectId');
	if (params.tenantId !== undefined) {
		assertNonEmpty(params.tenantId, 'tenantId');
	}
	if (params.domain !== undefined) {
		assertNonEmpty(params.domain, 'domain');
	}

	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + ttlSeconds;
	const jti = crypto.randomUUID();
	const payload: SubjectCapabilityPayload = {
		iss: issuer,
		aud: audience,
		sub: params.subjectId,
		tenantId: params.tenantId,
		action: params.action,
		domain: params.domain,
		iat,
		exp,
		jti,
	};
	const token = await new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256', typ: SUBJECT_CAPABILITY_TYPE })
		.sign(getSigningKey(params.options.signingKey));

	return { token, payload };
}

/**
 * Verifies a subject capability and all request-specific bindings.
 *
 * @param params - Token, verification options, and exact expected claims
 * @returns A discriminated result containing either verified claims or a
 * stable failure reason
 */
export function verifySubjectCapability(params: {
	token?: string;
	options: VerifySubjectCapabilityOptions;
	tenantId?: string;
	subjectId: string;
	action: WriteIntegrityAction;
	domain?: string;
}): Promise<SubjectCapabilityVerificationResult> {
	return verifyWriteIntegrityToken({
		token: params.token,
		verificationKey:
			params.options.verificationKey ?? params.options.signingKey,
		issuer: params.options.issuer?.trim() || DEFAULT_ISSUER,
		audience: params.options.audience?.trim() || DEFAULT_AUDIENCE,
		type: SUBJECT_CAPABILITY_TYPE,
		isPayload: isSubjectCapabilityPayload,
		matchesExpectedClaims: (payload) =>
			payload.sub === params.subjectId &&
			payload.action === params.action &&
			(payload.tenantId ?? undefined) === (params.tenantId ?? undefined) &&
			(payload.domain ?? undefined) === (params.domain ?? undefined),
	});
}

function isSubjectCapabilityPayload(
	payload: JWTPayload
): payload is SubjectCapabilityPayload {
	return isWriteIntegrityPayload(payload);
}
