import { type JWTPayload, errors as joseErrors, jwtVerify } from 'jose';
import type { WriteIntegrityAction } from '~/types';

/**
 * Actions that a write-integrity token can authorize.
 */
export type { WriteIntegrityAction } from '~/types';

/**
 * Stable failure classifications returned by write-integrity token verifiers.
 */
export type WriteIntegrityVerificationFailureReason =
	| 'missing'
	| 'malformed'
	| 'expired'
	| 'invalid';

/**
 * Claims shared by subject capabilities and identity assertions.
 */
export interface WriteIntegrityPayload extends JWTPayload {
	iss: string;
	aud: string;
	sub: string;
	tenantId?: string;
	action: WriteIntegrityAction;
	domain?: string;
	iat: number;
	exp: number;
	jti: string;
}

/**
 * A successful or failed write-integrity token verification.
 *
 * @typeParam Payload - The claims returned for a valid token
 */
export type WriteIntegrityVerificationResult<
	Payload extends WriteIntegrityPayload,
> =
	| {
			valid: true;
			payload: Payload;
	  }
	| {
			valid: false;
			reason: WriteIntegrityVerificationFailureReason;
	  };

interface VerifyTokenParams<Payload extends WriteIntegrityPayload> {
	token?: string;
	verificationKey: string;
	issuer: string;
	audience: string;
	type: string;
	maxAgeSeconds?: number;
	isPayload: (payload: JWTPayload) => payload is Payload;
	matchesExpectedClaims: (payload: Payload) => boolean;
}

const WRITE_INTEGRITY_ACTIONS: ReadonlySet<string> = new Set([
	'consent:create',
	'identity:link',
	'identity:reassign',
]);

/** @internal */
export function getSigningKey(secret: string): Uint8Array {
	return new TextEncoder().encode(secret);
}

/** @internal */
export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

/** @internal */
export function isWriteIntegrityAction(
	value: unknown
): value is WriteIntegrityAction {
	return typeof value === 'string' && WRITE_INTEGRITY_ACTIONS.has(value);
}

/** @internal */
export function isWriteIntegrityPayload(
	payload: JWTPayload
): payload is WriteIntegrityPayload {
	return (
		isNonEmptyString(payload.iss) &&
		isNonEmptyString(payload.aud) &&
		isNonEmptyString(payload.sub) &&
		(payload.tenantId === undefined || isNonEmptyString(payload.tenantId)) &&
		isWriteIntegrityAction(payload.action) &&
		(payload.domain === undefined || isNonEmptyString(payload.domain)) &&
		typeof payload.iat === 'number' &&
		Number.isFinite(payload.iat) &&
		typeof payload.exp === 'number' &&
		Number.isFinite(payload.exp) &&
		payload.exp > payload.iat &&
		isNonEmptyString(payload.jti)
	);
}

/** @internal */
export function assertNonEmpty(value: string, name: string): void {
	if (!isNonEmptyString(value)) {
		throw new TypeError(`${name} must be a non-empty string`);
	}
}

/** @internal */
export function resolveTtlSeconds(
	ttlSeconds: number | undefined,
	defaultTtlSeconds: number
): number {
	const resolved = ttlSeconds ?? defaultTtlSeconds;
	if (!Number.isSafeInteger(resolved) || resolved <= 0) {
		throw new RangeError('ttlSeconds must be a positive integer');
	}

	return resolved;
}

/** @internal */
export async function verifyWriteIntegrityToken<
	Payload extends WriteIntegrityPayload,
>(
	params: VerifyTokenParams<Payload>
): Promise<WriteIntegrityVerificationResult<Payload>> {
	if (!params.token) {
		return { valid: false, reason: 'missing' };
	}

	const segments = params.token.split('.');
	if (segments.length !== 3 || segments.some((segment) => !segment)) {
		return { valid: false, reason: 'malformed' };
	}

	try {
		const { payload, protectedHeader } = await jwtVerify(
			params.token,
			getSigningKey(params.verificationKey),
			{
				algorithms: ['HS256'],
				issuer: params.issuer,
				audience: params.audience,
				maxTokenAge: params.maxAgeSeconds,
			}
		);

		if (
			protectedHeader.alg !== 'HS256' ||
			protectedHeader.typ !== params.type ||
			!params.isPayload(payload) ||
			!params.matchesExpectedClaims(payload)
		) {
			return { valid: false, reason: 'invalid' };
		}

		return { valid: true, payload };
	} catch (error) {
		if (error instanceof joseErrors.JWTExpired) {
			return { valid: false, reason: 'expired' };
		}
		if (
			error instanceof joseErrors.JWTInvalid ||
			error instanceof joseErrors.JWSInvalid
		) {
			return { valid: false, reason: 'malformed' };
		}

		return { valid: false, reason: 'invalid' };
	}
}
