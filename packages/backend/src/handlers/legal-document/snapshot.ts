import {
	type JWTHeaderParameters,
	type JWTPayload,
	errors as joseErrors,
	jwtVerify,
	SignJWT,
} from 'jose';
import type {
	LegalDocumentPolicyType,
	LegalDocumentSnapshotOptions,
} from '~/types';

export type LegalDocumentSnapshotVerificationFailureReason =
	| 'missing'
	| 'malformed'
	| 'expired'
	| 'invalid';

export type LegalDocumentSnapshotVerificationResult =
	| {
			valid: true;
			payload: LegalDocumentSnapshotPayload;
	  }
	| {
			valid: false;
			reason: LegalDocumentSnapshotVerificationFailureReason;
	  };

export interface LegalDocumentSnapshotPayload extends JWTPayload {
	iss: string;
	aud: string;
	sub: string;
	tenantId?: string;
	type: LegalDocumentPolicyType;
	version: string;
	hash: string;
	effectiveDate: string;
	iat: number;
	exp: number;
}

interface JwtHeader extends JWTHeaderParameters {
	alg: 'HS256';
	typ: 'JWT';
}

const LEGAL_DOCUMENT_SNAPSHOT_JWT_HEADER: JwtHeader = {
	alg: 'HS256',
	typ: 'JWT',
};
const DEFAULT_ISSUER = 'c15t';
const DEFAULT_AUDIENCE = 'c15t-legal-document-snapshot';

function isLegalDocumentPolicyType(
	type: unknown
): type is LegalDocumentPolicyType {
	return (
		type === 'privacy_policy' ||
		type === 'terms_and_conditions' ||
		type === 'dpa'
	);
}

function resolveSnapshotIssuer(options?: LegalDocumentSnapshotOptions): string {
	return options?.issuer?.trim() || DEFAULT_ISSUER;
}

function resolveSnapshotAudience(params: {
	options?: LegalDocumentSnapshotOptions;
	tenantId?: string;
}): string {
	const configuredAudience = params.options?.audience?.trim();
	if (configuredAudience) {
		return configuredAudience;
	}

	return params.tenantId
		? `${DEFAULT_AUDIENCE}:${params.tenantId}`
		: DEFAULT_AUDIENCE;
}

function getSigningKey(secret: string): Uint8Array {
	return new TextEncoder().encode(secret);
}

function isLegalDocumentSnapshotPayload(
	payload: JWTPayload
): payload is LegalDocumentSnapshotPayload {
	return (
		typeof payload.iss === 'string' &&
		typeof payload.aud === 'string' &&
		typeof payload.sub === 'string' &&
		isLegalDocumentPolicyType(payload.type) &&
		typeof payload.version === 'string' &&
		typeof payload.hash === 'string' &&
		typeof payload.effectiveDate === 'string' &&
		typeof payload.iat === 'number' &&
		typeof payload.exp === 'number'
	);
}

export async function createLegalDocumentSnapshotToken(params: {
	options?: LegalDocumentSnapshotOptions;
	tenantId?: string;
	type: LegalDocumentPolicyType;
	version: string;
	hash: string;
	effectiveDate: string;
	ttlSeconds?: number;
}): Promise<
	{ token: string; payload: LegalDocumentSnapshotPayload } | undefined
> {
	const { options } = params;
	if (!options?.signingKey) {
		return undefined;
	}

	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + (params.ttlSeconds ?? 1800);
	const iss = resolveSnapshotIssuer(options);
	const aud = resolveSnapshotAudience({
		options,
		tenantId: params.tenantId,
	});
	const payload: LegalDocumentSnapshotPayload = {
		iss,
		aud,
		sub: params.hash,
		tenantId: params.tenantId,
		type: params.type,
		version: params.version,
		hash: params.hash,
		effectiveDate: params.effectiveDate,
		iat,
		exp,
	};

	const token = await new SignJWT(payload)
		.setProtectedHeader(LEGAL_DOCUMENT_SNAPSHOT_JWT_HEADER)
		.setIssuedAt(iat)
		.setExpirationTime(exp)
		.sign(getSigningKey(options.signingKey));

	return { token, payload };
}

export async function verifyLegalDocumentSnapshotToken(params: {
	token?: string;
	options?: LegalDocumentSnapshotOptions;
	tenantId?: string;
}): Promise<LegalDocumentSnapshotVerificationResult> {
	const { token, options, tenantId } = params;
	if (!options?.signingKey) {
		return {
			valid: false,
			reason: 'missing',
		};
	}

	if (!token) {
		return {
			valid: false,
			reason: 'missing',
		};
	}

	if (token.split('.').length !== 3) {
		return {
			valid: false,
			reason: 'malformed',
		};
	}

	try {
		const { payload, protectedHeader } = await jwtVerify(
			token,
			getSigningKey(options.signingKey),
			{
				issuer: resolveSnapshotIssuer(options),
				audience: resolveSnapshotAudience({ options, tenantId }),
			}
		);
		const header = protectedHeader as Partial<JwtHeader>;
		if (header.alg !== 'HS256' || header.typ !== 'JWT') {
			return {
				valid: false,
				reason: 'invalid',
			};
		}
		if (!isLegalDocumentSnapshotPayload(payload)) {
			return {
				valid: false,
				reason: 'invalid',
			};
		}
		if (payload.sub !== payload.hash) {
			return {
				valid: false,
				reason: 'invalid',
			};
		}
		if ((tenantId ?? undefined) !== (payload.tenantId ?? undefined)) {
			return {
				valid: false,
				reason: 'invalid',
			};
		}

		return {
			valid: true,
			payload,
		};
	} catch (error) {
		if (error instanceof joseErrors.JWTExpired) {
			return {
				valid: false,
				reason: 'expired',
			};
		}
		return {
			valid: false,
			reason: 'invalid',
		};
	}
}
