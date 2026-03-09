import type {
	JurisdictionCode,
	PolicyModel,
	PolicyScopeMode,
	PolicySnapshotOptions,
	PolicyUiMode,
	PolicyUiSurfaceConfig,
} from '~/types';
import type { PolicyMatchedBy } from '../init/policy';

export interface PolicySnapshotUiSurface {
	allowedActions?: PolicyUiSurfaceConfig['allowedActions'];
	primaryAction?: PolicyUiSurfaceConfig['primaryAction'];
	actionOrder?: PolicyUiSurfaceConfig['actionOrder'];
	actionLayout?: PolicyUiSurfaceConfig['actionLayout'];
	uiProfile?: PolicyUiSurfaceConfig['uiProfile'];
	scrollLock?: PolicyUiSurfaceConfig['scrollLock'];
}

export interface PolicySnapshotPayload {
	tenantId?: string;
	policyId: string;
	fingerprint: string;
	matchedBy: PolicyMatchedBy;
	country: string | null;
	region: string | null;
	jurisdiction: JurisdictionCode;
	language?: string;
	model: PolicyModel;
	expiryDays?: number;
	scopeMode?: PolicyScopeMode;
	uiMode?: PolicyUiMode;
	bannerUi?: PolicySnapshotUiSurface;
	dialogUi?: PolicySnapshotUiSurface;
	categories?: string[];
	proofConfig?: {
		storeIp?: boolean;
		storeUserAgent?: boolean;
		storeLanguage?: boolean;
	};
	iat: number;
	exp: number;
}

function toBase64Url(bytes: Uint8Array): string {
	const bin = String.fromCharCode(...bytes);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
	const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const bin = atob(padded);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i += 1) {
		bytes[i] = bin.charCodeAt(i);
	}
	return bytes;
}

async function getSigningKey(secret: string): Promise<unknown> {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

async function sign(input: string, secret: string): Promise<string> {
	const key = await getSigningKey(secret);
	const signature = await crypto.subtle.sign(
		'HMAC',
		key as never,
		new TextEncoder().encode(input)
	);
	return toBase64Url(new Uint8Array(signature));
}

async function verify(
	input: string,
	signature: string,
	secret: string
): Promise<boolean> {
	const key = await getSigningKey(secret);
	const isValid = await crypto.subtle.verify(
		'HMAC',
		key as never,
		fromBase64Url(signature),
		new TextEncoder().encode(input)
	);
	return isValid;
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
	expiryDays?: number;
	scopeMode?: PolicyScopeMode;
	uiMode?: PolicyUiMode;
	bannerUi?: PolicySnapshotUiSurface;
	dialogUi?: PolicySnapshotUiSurface;
	categories?: string[];
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
	const payload: PolicySnapshotPayload = {
		tenantId: params.tenantId,
		policyId: params.policyId,
		fingerprint: params.fingerprint,
		matchedBy: params.matchedBy,
		country: params.country,
		region: params.region,
		jurisdiction: params.jurisdiction,
		language: params.language,
		model: params.model,
		expiryDays: params.expiryDays,
		scopeMode: params.scopeMode,
		uiMode: params.uiMode,
		bannerUi: params.bannerUi,
		dialogUi: params.dialogUi,
		categories: params.categories,
		proofConfig: params.proofConfig,
		iat,
		exp: iat + ttlSeconds,
	};

	const encodedPayload = toBase64Url(
		new TextEncoder().encode(JSON.stringify(payload))
	);
	const signature = await sign(encodedPayload, options.signingKey);

	return {
		token: `${encodedPayload}.${signature}`,
		payload,
	};
}

export async function verifyPolicySnapshotToken(params: {
	token?: string;
	options?: PolicySnapshotOptions;
}): Promise<PolicySnapshotPayload | null> {
	const { token, options } = params;
	if (!token || !options?.signingKey) {
		return null;
	}

	const [encodedPayload, signature] = token.split('.');
	if (!encodedPayload || !signature) {
		return null;
	}

	const isValid = await verify(encodedPayload, signature, options.signingKey);
	if (!isValid) {
		return null;
	}

	try {
		const payloadJson = new TextDecoder().decode(fromBase64Url(encodedPayload));
		const payload = JSON.parse(payloadJson) as PolicySnapshotPayload;
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp < now) {
			return null;
		}
		return payload;
	} catch {
		return null;
	}
}
