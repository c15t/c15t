import {
	type JWTHeaderParameters,
	type JWTPayload,
	errors as joseErrors,
	jwtVerify,
	SignJWT,
} from 'jose';
import type {
	JurisdictionCode,
	PolicyModel,
	PolicyScopeMode,
	PolicySnapshotOptions,
	PolicyUiMode,
	PolicyUiSurfaceConfig,
} from '~/types';
import type { PolicyMatchedBy } from '../init/policy';

export type PolicySnapshotVerificationFailureReason =
	| 'missing'
	| 'malformed'
	| 'expired'
	| 'invalid';

export type PolicySnapshotVerificationResult =
	| {
			valid: true;
			payload: PolicySnapshotPayload;
	  }
	| {
			valid: false;
			reason: PolicySnapshotVerificationFailureReason;
	  };

export interface PolicySnapshotUiSurface {
	allowedActions?: PolicyUiSurfaceConfig['allowedActions'];
	primaryAction?: PolicyUiSurfaceConfig['primaryAction'];
	actionOrder?: PolicyUiSurfaceConfig['actionOrder'];
	actionLayout?: PolicyUiSurfaceConfig['actionLayout'];
	uiProfile?: PolicyUiSurfaceConfig['uiProfile'];
	scrollLock?: PolicyUiSurfaceConfig['scrollLock'];
}

/**
 * JWT payload for a policy snapshot token.
 *
 * @remarks
 * Fields are intentionally flattened from the nested `ResolvedPolicy` structure
 * to keep the JWT compact. For example, `scopeMode` maps to
 * `ResolvedPolicy.consent.scopeMode` and `uiMode` maps to
 * `ResolvedPolicy.ui.mode`. The post handler reconstructs the nested shape
 * when verifying the token.
 */
export interface PolicySnapshotPayload extends JWTPayload {
	iss: string;
	aud: string;
	sub: string;
	tenantId?: string;
	policyId: string;
	fingerprint: string;
	matchedBy: PolicyMatchedBy;
	country: string | null;
	region: string | null;
	jurisdiction: JurisdictionCode;
	language?: string;
	model: PolicyModel;
	policyI18n?: {
		language?: string;
		messageProfile?: string;
	};
	expiryDays?: number;
	scopeMode?: PolicyScopeMode;
	uiMode?: PolicyUiMode;
	bannerUi?: PolicySnapshotUiSurface;
	dialogUi?: PolicySnapshotUiSurface;
	categories?: string[];
	preselectedCategories?: string[];
	gpc?: boolean;
	proofConfig?: {
		storeIp?: boolean;
		storeUserAgent?: boolean;
		storeLanguage?: boolean;
	};
	iat: number;
	exp: number;
}

interface JwtHeader extends JWTHeaderParameters {
	alg: 'HS256';
	typ: 'JWT';
}

const POLICY_SNAPSHOT_JWT_HEADER: JwtHeader = {
	alg: 'HS256',
	typ: 'JWT',
};
const DEFAULT_POLICY_SNAPSHOT_ISSUER = 'c15t';
const DEFAULT_POLICY_SNAPSHOT_AUDIENCE = 'c15t-policy-snapshot';

function resolveSnapshotIssuer(options?: PolicySnapshotOptions): string {
	return options?.issuer?.trim() || DEFAULT_POLICY_SNAPSHOT_ISSUER;
}

function resolveSnapshotAudience(params: {
	options?: PolicySnapshotOptions;
	tenantId?: string;
}): string {
	const configuredAudience = params.options?.audience?.trim();
	if (configuredAudience) {
		return configuredAudience;
	}

	return params.tenantId
		? `${DEFAULT_POLICY_SNAPSHOT_AUDIENCE}:${params.tenantId}`
		: DEFAULT_POLICY_SNAPSHOT_AUDIENCE;
}

function getSigningKey(secret: string): Uint8Array {
	return new TextEncoder().encode(secret);
}

function isPolicySnapshotPayload(
	payload: JWTPayload
): payload is PolicySnapshotPayload {
	return (
		typeof payload.policyId === 'string' &&
		typeof payload.fingerprint === 'string' &&
		typeof payload.matchedBy === 'string' &&
		typeof payload.jurisdiction === 'string' &&
		typeof payload.model === 'string' &&
		typeof payload.iss === 'string' &&
		typeof payload.aud === 'string' &&
		typeof payload.sub === 'string' &&
		typeof payload.iat === 'number' &&
		typeof payload.exp === 'number'
	);
}

export async function createPolicySnapshotToken(params: {
	options?: PolicySnapshotOptions;
	tenantId?: string;
	policyId: string;
	fingerprint: string;
	matchedBy: PolicyMatchedBy;
	country: string | null;
	region: string | null;
	jurisdiction: JurisdictionCode;
	language?: string;
	model: PolicyModel;
	policyI18n?: {
		language?: string;
		messageProfile?: string;
	};
	expiryDays?: number;
	scopeMode?: PolicyScopeMode;
	uiMode?: PolicyUiMode;
	bannerUi?: PolicySnapshotUiSurface;
	dialogUi?: PolicySnapshotUiSurface;
	categories?: string[];
	preselectedCategories?: string[];
	gpc?: boolean;
	proofConfig?: {
		storeIp?: boolean;
		storeUserAgent?: boolean;
		storeLanguage?: boolean;
	};
}): Promise<{ token: string; payload: PolicySnapshotPayload } | undefined> {
	const { options } = params;
	if (!options?.signingKey) {
		return undefined;
	}

	const iat = Math.floor(Date.now() / 1000);
	const ttlSeconds = options.ttlSeconds ?? 1800;
	const exp = iat + ttlSeconds;
	const iss = resolveSnapshotIssuer(options);
	const aud = resolveSnapshotAudience({
		options,
		tenantId: params.tenantId,
	});
	const payload: PolicySnapshotPayload = {
		iss,
		aud,
		sub: params.policyId,
		tenantId: params.tenantId,
		policyId: params.policyId,
		fingerprint: params.fingerprint,
		matchedBy: params.matchedBy,
		country: params.country,
		region: params.region,
		jurisdiction: params.jurisdiction,
		language: params.language,
		model: params.model,
		policyI18n: params.policyI18n,
		expiryDays: params.expiryDays,
		scopeMode: params.scopeMode,
		uiMode: params.uiMode,
		bannerUi: params.bannerUi,
		dialogUi: params.dialogUi,
		categories: params.categories,
		preselectedCategories: params.preselectedCategories,
		gpc: params.gpc,
		proofConfig: params.proofConfig,
		iat,
		exp,
	};

	const token = await new SignJWT(payload)
		.setProtectedHeader(POLICY_SNAPSHOT_JWT_HEADER)
		.setIssuedAt(iat)
		.setExpirationTime(exp)
		.sign(getSigningKey(options.signingKey));

	return {
		token,
		payload,
	};
}

export async function verifyPolicySnapshotToken(params: {
	token?: string;
	options?: PolicySnapshotOptions;
	tenantId?: string;
}): Promise<PolicySnapshotVerificationResult> {
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
		if (!isPolicySnapshotPayload(payload)) {
			return {
				valid: false,
				reason: 'invalid',
			};
		}
		if (payload.sub !== payload.policyId) {
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
