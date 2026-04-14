import { SignJWT } from 'jose';
import {
	DEMO_LEGAL_DOCUMENT_SNAPSHOT,
	DEMO_LEGAL_DOCUMENT_SNAPSHOT_AUDIENCE,
} from './demo-legal-document-snapshot';

type LegalDocumentType = 'privacy_policy' | 'terms_and_conditions' | 'dpa';

export interface UnsafeDemoLegalDocumentSnapshotInput {
	type: LegalDocumentType;
	version: string;
	hash: string;
	effectiveDate: string;
}

export interface UnsafeDemoLegalDocumentSnapshotResult {
	token: string;
	payload: {
		iss: string;
		aud: string;
		sub: string;
		tenantId?: string;
		type: LegalDocumentType;
		version: string;
		hash: string;
		effectiveDate: string;
		iat: number;
		exp: number;
	};
}

const DEFAULT_ISSUER = 'c15t';
const DEFAULT_TTL_SECONDS = 1800;

function resolveAudience(input: UnsafeDemoLegalDocumentSnapshotInput) {
	return DEMO_LEGAL_DOCUMENT_SNAPSHOT_AUDIENCE;
}

/**
 * Demo-only helper for local development until the real terms server can issue
 * authoritative snapshot tokens. This must never be treated as production-safe
 * because it requires exposing a signing key to the browser bundle.
 */
export async function createUnsafeDemoLegalDocumentSnapshotToken(
	input: UnsafeDemoLegalDocumentSnapshotInput
): Promise<UnsafeDemoLegalDocumentSnapshotResult> {
	const iat = Math.floor(Date.now() / 1000);
	const exp =
		iat + (DEMO_LEGAL_DOCUMENT_SNAPSHOT.ttlSeconds ?? DEFAULT_TTL_SECONDS);
	const iss = DEMO_LEGAL_DOCUMENT_SNAPSHOT.issuer || DEFAULT_ISSUER;
	const aud = resolveAudience(input);
	const payload = {
		iss,
		aud,
		sub: input.hash,
		tenantId: DEMO_LEGAL_DOCUMENT_SNAPSHOT.tenantId,
		type: input.type,
		version: input.version,
		hash: input.hash,
		effectiveDate: input.effectiveDate,
		iat,
		exp,
	};

	const token = await new SignJWT(payload)
		.setProtectedHeader({
			alg: 'HS256',
			typ: 'JWT',
		})
		.setIssuedAt(iat)
		.setExpirationTime(exp)
		.sign(new TextEncoder().encode(DEMO_LEGAL_DOCUMENT_SNAPSHOT.signingKey));

	return {
		token,
		payload,
	};
}
